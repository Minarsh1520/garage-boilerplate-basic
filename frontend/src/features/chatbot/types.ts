import { z } from 'zod'

// One kind per technical state in Nihal's escalation doc (LOADING is client-side only).
export const ASSISTANT_KINDS = ['answer', 'clarify', 'fallback', 'escalate', 'error'] as const
export type AssistantMessageKind = (typeof ASSISTANT_KINDS)[number]

// Who a human-only matter goes to, and what sort of matter it is. Kept here (not in
// the rules file) because the reply, the rules and the model decision all share them.
export const PATHWAYS = ['HR', 'IT', 'Manager'] as const
export type Pathway = (typeof PATHWAYS)[number]
export const ESCALATION_CATEGORIES = ['pay', 'complaint', 'employment-decision', 'restricted-action', 'wellbeing', 'other'] as const
export type EscalationCategory = (typeof ESCALATION_CATEGORIES)[number]

// A user turn and an assistant turn get different length limits on purpose:
// a typed question is never thousands of characters, but a real AI reply
// legitimately can be. Since the whole history (including past assistant
// replies) is rebuilt and sent by the client on every turn, the server can't
// tell a genuine past reply apart from someone forging one, so assistant
// turns still need a real (just more generous) cap, not no cap at all.
export const MAX_QUESTION_LENGTH = 2000

export const chatTurnSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), text: z.string().min(1).max(MAX_QUESTION_LENGTH) }),
  // `kind` lets the server see that the previous reply was a clarifying question.
  // It is client-supplied, so it is only ever used to pick which of the employee's
  // OWN earlier questions to re-read. Assistant TEXT is still never read.
  z.object({ role: z.literal('assistant'), text: z.string().min(1).max(8000), kind: z.enum(ASSISTANT_KINDS).optional() }),
])

export const sendChatMessageSchema = z.array(chatTurnSchema).min(1).max(50)

export type ChatTurn = z.infer<typeof chatTurnSchema>

export interface AssistantReply {
  text: string
  kind: AssistantMessageKind
  sources: { policyTitle: string; headingPath: string }[] // shown under answers
  pathway?: Pathway                // escalations only
  category?: EscalationCategory    // escalations only
  errorCode?: string               // errors only, e.g. 'AI-503'. Shown to the employee and written in the log
  retryable?: boolean              // errors only: show a "Try again" button
  suggestions?: string[]           // ready-made questions shown as buttons
}