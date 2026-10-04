'use server'

import { requireAuth } from '@/actions/auth.actions'
import type { ActionResult } from '@/types'
import { getRagDeps } from '@/lib/rag/server'
import type { RagDeps } from '@/lib/rag/types'
import { adminDb } from '@/lib/firebase/admin'
import { MAX_QUESTION_LENGTH, requestEscalationSchema, sendChatMessageSchema, type AssistantReply } from '@/features/chatbot/types'
import { createEscalationCase } from '@/features/chatbot/lib/escalation'
import { StageError } from '@/features/chatbot/lib/errors'
import { pickQuestion } from '@/features/chatbot/lib/history'
import { answerQuestion, errorReply } from '@/features/chatbot/lib/pipeline'
import { matchSensitiveRule } from '@/features/chatbot/lib/rules'

// Thin wrapper: who is asking, and what did they ask. All the answering logic lives in
// lib/pipeline.ts so it can be tested and probed without Next.js.
export async function sendChatMessage(history: unknown): Promise<ActionResult<AssistantReply>> {
  const session = await requireAuth()

  const parsed = sendChatMessageSchema.safeParse(history)
  if (!parsed.success) {
    // Say WHY it was rejected. "Please enter a question" for an over-long question is misleading.
    const tooLong = parsed.error.issues.some((issue) => issue.code === 'too_big' && issue.path.at(-1) === 'text')
    return {
      success: false,
      error: tooLong ? `Your question is too long. Please keep it under ${MAX_QUESTION_LENGTH} characters.` : 'Please enter a question.',
    }
  }
  const { question, earlierQuestion } = pickQuestion(parsed.data)
  if (!question) return { success: false, error: 'Please enter a question.' }

  let deps: RagDeps
  try {
    deps = getRagDeps()
  } catch (error) {
    // e.g. GEMINI_API_KEY missing. Logged as APP-CONFIG; the employee never sees the detail.
    return { success: true, data: errorReply(new StageError('setup', error)) }
  }

  return { success: true, data: await answerQuestion(deps, { uid: session.uid, question, earlierQuestion }) }
}

// Called when the employee presses "Send to HR team". This is the only way a case is
// created, so the chat can never claim something was sent when it wasn't.
export async function requestEscalation(input: unknown): Promise<ActionResult<{ caseId: string }>> {
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
    const caseId = await createEscalationCase({ db: adminDb }, { uid: session.uid, question, category, pathway })
    return { success: true, data: { caseId } }
  } catch (error) {
    // Full detail stays in the server log (SECURITY.md); the employee is told it was NOT sent.
    console.error('[chat] DB-ESCALATION side=app stage=escalation', error)
    return { success: false, error: 'Your question could not be sent to the HR team. Please contact HR directly. (Ref: DB-ESCALATION)' }
  }
}
