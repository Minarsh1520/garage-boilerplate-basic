'use server'

import { GoogleGenAI } from '@google/genai'
import { requireAuth } from '@/actions/auth.actions'
import { getEmployeeOnboarding } from '@/lib/onboarding'
import type { ActionResult } from '@/types'
import { sendChatMessageSchema, type AssistantReply } from '@/features/chatbot/types'

export async function sendChatMessage(history: unknown): Promise<ActionResult<AssistantReply>> {
  const session = await requireAuth()

  const parsed = sendChatMessageSchema.safeParse(history)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid message history' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'GEMINI_API_KEY is not set — see docs/ENV-VARS.md' }
  }

  const onboarding = await getEmployeeOnboarding(session.uid)

  // Gemini calls its own past turns 'model', not 'assistant', and expects each
  // turn wrapped as { role, parts: [{ text }] } rather than a plain string.
  // Sending the whole conversation gives the model context on earlier turns.
  // Employee onboarding data is also provided for employee-specific questions.
  const contents = parsed.data.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.text }],
  }))

  const employeeContext = onboarding
    ? `Employee onboarding data: ${JSON.stringify(onboarding)}`
    : 'No onboarding data is available for the logged-in employee. Do not invent employee-specific information.'

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction: employeeContext,
      },
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