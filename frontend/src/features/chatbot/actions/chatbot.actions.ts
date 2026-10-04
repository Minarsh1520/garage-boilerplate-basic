'use server'

import { requireAuth } from '@/actions/auth.actions'
import type { ActionResult } from '@/types'
import { getRagDeps } from '@/lib/rag/server'
import type { RagDeps } from '@/lib/rag/types'
import { MAX_QUESTION_LENGTH, sendChatMessageSchema, type AssistantReply } from '@/features/chatbot/types'
import { StageError } from '@/features/chatbot/lib/errors'
import { pickQuestion } from '@/features/chatbot/lib/history'
import { answerQuestion, errorReply } from '@/features/chatbot/lib/pipeline'

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