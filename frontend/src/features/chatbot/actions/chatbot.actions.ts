'use server'

import { requireAuth } from '@/actions/auth.actions'
import type { ActionResult } from '@/types'
import { getRagDeps } from '@/lib/rag/server'
import type { RagDeps } from '@/lib/rag/types'
import { adminDb } from '@/lib/firebase/admin'
import { completeTaskSchema, MAX_QUESTION_LENGTH, requestEscalationSchema, sendChatInputSchema, type AssistantReply, type ChatTurn } from '@/features/chatbot/types'
import { getOwnedConversation, readMessages, RECENT_MESSAGES_READ, saveExchange, toExchanges } from '@/features/chatbot/lib/conversations'
import { createEscalationCase, MAX_CASES_PER_DAY } from '@/features/chatbot/lib/escalation'
import { StageError } from '@/features/chatbot/lib/errors'
import { pickQuestion } from '@/features/chatbot/lib/history'
import { answerQuestion, errorReply } from '@/features/chatbot/lib/pipeline'
import { matchSensitiveRule } from '@/features/chatbot/lib/rules'
import { completeOwnTask } from '@/features/chatbot/lib/task-completion'

export interface ChatResponse {
  reply: AssistantReply
  conversationId?: string // missing only if saving failed; the answer is still shown
  title?: string
  assistantMessageId?: string
}

// Thin wrapper: who is asking, what they asked, and in which conversation. All the
// answering logic lives in lib/pipeline.ts so it can be tested without Next.js.
export async function sendChatMessage(input: unknown): Promise<ActionResult<ChatResponse>> {
  const session = await requireAuth()

  const parsed = sendChatInputSchema.safeParse(input)
  if (!parsed.success) {
    // Say WHY it was rejected. "Please enter a question" for an over-long question is misleading.
    const tooLong = parsed.error.issues.some((issue) => issue.code === 'too_big' && issue.path.at(-1) === 'question')
    return {
      success: false,
      error: tooLong ? `Your question is too long. Please keep it under ${MAX_QUESTION_LENGTH} characters.` : 'Please enter a question.',
    }
  }
  const { question, skipFaq, conversationId } = parsed.data

  // The conversation must belong to whoever is signed in. Someone else's id is treated as missing.
  const conversation = conversationId ? await getOwnedConversation(adminDb, session.uid, conversationId) : null
  if (conversationId && !conversation) return { success: false, error: 'That conversation could not be found. Please start a new one.' }

  let deps: RagDeps
  try {
    deps = getRagDeps()
  } catch (error) {
    // e.g. GEMINI_API_KEY missing. Logged as APP-CONFIG; the employee never sees the detail.
    return { success: true, data: { reply: errorReply(new StageError('setup', error)), conversationId } }
  }

  // Earlier messages come from the server's own saved copy, never from the browser.
  const recent = conversation ? await readMessages(adminDb, conversation.id, { last: RECENT_MESSAGES_READ }) : []
  const turns: ChatTurn[] = [
    ...recent.map((m) => (m.role === 'user' ? { role: 'user' as const, text: m.text } : { role: 'assistant' as const, text: m.text, kind: m.kind })),
    { role: 'user', text: question },
  ]
  const { earlierQuestion } = pickQuestion(turns)

  const { memory, ...reply } = await answerQuestion(deps, {
    uid: session.uid,
    question,
    earlierQuestion,
    skipFaq,
    conversation: {
      isFirstTurn: !conversation,
      // A summary the employee asked for is fuller than the one-line description, so it wins.
      keyPoints: conversation?.summary ?? conversation?.description,
      topic: conversation?.topic,
      recent: toExchanges(recent),
    },
  })

  // Errors aren't saved: the question gets "Try again", and saving it would leave a
  // question with no answer in the history.
  if (reply.kind === 'error') return { success: true, data: { reply, conversationId } }

  try {
    const saved = await saveExchange(adminDb, { uid: session.uid, conversation, question, reply: { ...reply, memory } })
    return { success: true, data: { reply, ...saved } }
  } catch (error) {
    // The employee still gets the answer; only the history is missing it.
    console.error('[chat] DB-HISTORY side=app stage=save', error)
    return { success: true, data: { reply, conversationId } }
  }
}

// Called when the employee presses "Send to HR team". This is the only way a case is
// created, so the chat can never claim something was sent when it wasn't.
export async function requestEscalation(input: unknown): Promise<ActionResult<{ caseId: string; alreadySent?: boolean }>> {
  // WHO is asking comes from the session, never from what the browser sent.
  const session = await requireAuth()

  const parsed = requestEscalationSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'That request could not be sent. Please try again.' }
  const { question } = parsed.data

  // The browser sends back the category it was offered. Where one of our own rules matches
  // the question, the rule wins, so the case type can't be changed by editing the request.
  const rule = matchSensitiveRule(question)
  const category = rule?.category ?? parsed.data.category
  const pathway = rule?.pathway ?? parsed.data.pathway

  try {
    const result = await createEscalationCase({ db: adminDb }, { uid: session.uid, question, category, pathway })
    switch (result.status) {
      case 'created':
        return { success: true, data: { caseId: result.caseId } }
      // Already sent: give the same reference again instead of making a second case.
      case 'duplicate':
        return { success: true, data: { caseId: result.caseId, alreadySent: true } }
      case 'daily-limit':
        return {
          success: false,
          error: `You have sent ${MAX_CASES_PER_DAY} non-urgent requests to the HR team in the last 24 hours, which is the limit, so this one was not sent. The HR team will reply to those first. Urgent or sensitive matters can still be sent, and you can always contact HR directly.`,
        }
    }
  } catch (error) {
    // Full detail stays in the server log (SECURITY.md); the employee is told it was NOT sent.
    console.error('[chat] DB-ESCALATION side=app stage=escalation', error)
    return { success: false, error: 'Your question could not be sent to the HR team. Please contact HR directly. (Ref: DB-ESCALATION)' }
  }
}

// Called when the employee presses Confirm on "Mark task completed". The only way the
// assistant changes a checklist. The task is looked up again in the employee's OWN record
// (uid from the session) and every check from the offer is repeated, because the browser
// could send any id. What the employee is told comes from the result of the save.
export async function completeMyTask(input: unknown): Promise<ActionResult<{ title: string }>> {
  const session = await requireAuth()
  const parsed = completeTaskSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'That task could not be found. Nothing was changed.' }

  try {
    const result = await completeOwnTask({ db: adminDb }, session.uid, parsed.data.taskId)
    switch (result.status) {
      case 'ok':
        return { success: true, data: { title: result.title ?? parsed.data.taskId } }
      case 'already-completed':
        return { success: false, error: `"${result.title}" was already marked as completed. Nothing was changed.` }
      case 'not-allowed':
        return { success: false, error: `"${result.title}" can't be marked done from the Assistant. Nothing was changed.` }
      case 'no-record':
        return { success: false, error: "Your onboarding record couldn't be found. Nothing was changed. Please contact HR." }
      case 'not-found':
        return { success: false, error: 'That task is not on your checklist. Nothing was changed.' }
    }
  } catch (error) {
    console.error('[chat] DB-TASK side=app stage=complete-task', error)
    return { success: false, error: 'The task could not be updated. Nothing was changed. Please try again later. (Ref: DB-TASK)' }
  }
}
