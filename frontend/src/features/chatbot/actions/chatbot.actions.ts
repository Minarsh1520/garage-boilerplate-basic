'use server'

import { GoogleGenAI } from '@google/genai'
import { requireAuth } from '@/actions/auth.actions'
import type { ActionResult } from '@/types'
import { sendChatMessageSchema, type AssistantReply } from '@/features/chatbot/types'

export async function sendChatMessage(history: unknown): Promise<ActionResult<AssistantReply>> {
  await requireAuth()

  const parsed = sendChatMessageSchema.safeParse(history)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid message history' }
  }

  const question = parsed.data.at(-1)?.text
  if (!question) {
    return { success: false, error: 'No message to send' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'GEMINI_API_KEY is not set — see docs/ENV-VARS.md' }
  }

  // Single call, no retrieval/history/prompt-engineering yet — `parsed.data` already
  // carries the full turn history for when that's needed, but today only the latest
  // question is sent.
  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      contents: question,
    })

    return {
      success: true,
      data: {
        text: response.text ?? 'The model returned an empty response.',
        kind: 'answer',
      },
    }
  } catch (error) {
    console.error('sendChatMessage failed:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Failed to reach the AI provider: ${message}` }
  }
}
