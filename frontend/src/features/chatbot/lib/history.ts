import type { AssistantMessageKind, ChatTurn } from '../types'

// Only the employee's own words are ever used. Client-supplied assistant TEXT is never
// read, so a forged "assistant" message can't inject fake policy.
// If the reply just before the latest question was a clarifying question, the question
// before THAT is returned too: "the TFN one" means nothing without "what do I do with this?".
export function pickQuestion(history: ChatTurn[]): { question?: string; earlierQuestion?: string } {
    const lastUserIndex = history.map((t) => t.role).lastIndexOf('user')
    const last = history[lastUserIndex]
    if (!last) return {}

    const previous = history[lastUserIndex - 1]
    const wasClarifying = previous?.role === 'assistant' && previous.kind === 'clarify'
    const earlier = wasClarifying ? history.slice(0, lastUserIndex - 1).filter((t) => t.role === 'user').at(-1) : undefined
    return { question: last.text, earlierQuestion: earlier?.text }
}

// Soft block for now given AI tier limitation
const MAX_TURNS_SENT = 6

// The server reads at most three turns (the question, the clarifying reply before it and
// the question before that), so a few recent turns are plenty. Sending the whole chat
// would hit the server's 50-turn limit and lock a long conversation out.
export function toHistory(messages: { role: 'user' | 'assistant'; text: string; kind?: AssistantMessageKind }[]): ChatTurn[] {
    return messages
        // Error bubbles are UI only, not conversation. The question that GOT the error is dropped
        // with it: "Try again" re-adds that question, and sending it twice would hide the
        // clarifying reply that came before it.
        .filter((m, i) => m.kind !== 'error' && messages[i + 1]?.kind !== 'error')
        .slice(-MAX_TURNS_SENT)
        .map((m) => (m.role === 'user' ? { role: 'user', text: m.text } : { role: 'assistant', text: m.text, kind: m.kind }))
}