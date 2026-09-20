import { z } from 'zod'

export const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().min(1).max(2000),
})

export const sendChatMessageSchema = z.array(chatTurnSchema).min(1).max(50)

export type ChatTurn = z.infer<typeof chatTurnSchema>

// 'answer' is a normal AI response. 'escalation' is reserved for when the real
// backend can't answer confidently and should hand off to a human/HR channel
// instead of guessing — not produced yet, but the UI already knows how to render it.
export type AssistantMessageKind = 'answer' | 'escalation'

export interface AssistantReply {
  text: string
  kind: AssistantMessageKind
}
