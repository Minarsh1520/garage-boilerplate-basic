import { z } from 'zod'

// A user turn and an assistant turn get different length limits on purpose:
// a typed question is never thousands of characters, but a real AI reply
// legitimately can be. Since the whole history (including past assistant
// replies) is rebuilt and sent by the client on every turn, the server can't
// tell a genuine past reply apart from someone forging one, so assistant
// turns still need a real (just more generous) cap, not no cap at all.
export const chatTurnSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), text: z.string().min(1).max(2000) }),
  z.object({ role: z.literal('assistant'), text: z.string().min(1).max(8000) }),
])

export const sendChatMessageSchema = z.array(chatTurnSchema).min(1).max(50)

export type ChatTurn = z.infer<typeof chatTurnSchema>

// One kind per technical state in Nihal's escalation doc (LOADING is client-side only).
export type AssistantMessageKind = 'answer' | 'clarify' | 'fallback' | 'escalate' | 'error'

export interface AssistantReply {
  text: string
  kind: AssistantMessageKind
  sources: { policyTitle: string; headingPath: string }[] // shown under answers
  pathway?: 'HR' | 'IT' | 'Manager'                       // escalations only
}
