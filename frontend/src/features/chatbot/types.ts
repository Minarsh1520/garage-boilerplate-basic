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
// One number for the server's limit AND the input box's limit, so they can't drift apart.
export const MAX_QUESTION_LENGTH = 2000

export const chatTurnSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), text: z.string().min(1).max(MAX_QUESTION_LENGTH) }),
  // `kind` lets the server see that the previous reply was a clarifying question.
  // It is client-supplied, so it is only ever used to pick which of the employee's
  // OWN earlier questions to re-read. Assistant TEXT is still never read.
  z.object({ role: z.literal('assistant'), text: z.string().min(1).max(8000), kind: z.enum(ASSISTANT_KINDS).optional() }),
])

// What a saved escalation case can be about: the model's categories, plus "no policy
// covers this", which is the app's own reason for offering HR.
export const CASE_CATEGORIES = [...ESCALATION_CATEGORIES, 'no-policy'] as const
export type CaseCategory = (typeof CASE_CATEGORIES)[number]

// What the chat window sends back when the employee presses "Send to HR team".
export const requestEscalationSchema = z.object({
  question: z.string().min(1).max(MAX_QUESTION_LENGTH),
  category: z.enum(CASE_CATEGORIES),
  pathway: z.enum(PATHWAYS),
})

// What the chat window sends. The conversation's earlier messages are NOT sent: the server
// reads them from its own saved copy, so it can trust them (the browser could fake them).
//   conversationId  missing for the first question of a new conversation
//   skipFaq         set by "Get a more detailed answer": skip the stored answer, ask the AI
export const sendChatInputSchema = z.object({
  conversationId: z.string().min(1).max(100).optional(),
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
  skipFaq: z.boolean().optional(),
})

export type ChatTurn = z.infer<typeof chatTurnSchema>

export interface AssistantReply {
  text: string
  kind: AssistantMessageKind
  sources: { policyTitle: string; headingPath: string }[] // shown under answers
  pathway?: Pathway                // escalations only
  errorCode?: string               // errors only, e.g. 'AI-503'. Shown to the employee and written in the log
  retryable?: boolean              // errors only: show a "Try again" button
  suggestions?: string[]           // ready-made questions shown as buttons
  // Present when the employee may send this question to the HR team. Nothing is saved
  // until they press the button: the offer alone creates no case.
  escalationOffer?: { category: CaseCategory; pathway: Pathway }
  // True when the text is a stored answer from the Admin FAQ page, not written by the AI.
  // The chat window then offers "Get a more detailed answer".
  fromFaq?: boolean
  // SERVER ONLY: what the model returned for the conversation list and for follow-ups.
  // Removed by the server action before the reply goes to the browser.
  memory?: { title?: string; description?: string; topic?: string }
}

// One saved message, as the chat window shows it after reopening a conversation.
export interface SavedMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  kind?: AssistantMessageKind
  sources?: AssistantReply['sources']
  fromFaq?: boolean
  createdAt?: string // ISO
}

// One row in the conversation list.
export interface ConversationSummary {
  id: string
  title: string
  description?: string
  updatedAt?: string // ISO
  messageCount: number
}