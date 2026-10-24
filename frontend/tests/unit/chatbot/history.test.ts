import { describe, it, expect } from 'vitest'
import { pickQuestion } from '@/features/chatbot/lib/history'
import { toHistory } from '@/features/chatbot/lib/history'
describe('pickQuestion', () => {
    it('uses only the latest user turn', () => {
        expect(pickQuestion([{ role: 'user', text: 'first' }, { role: 'assistant', text: 'reply', kind: 'answer' }, { role: 'user', text: 'second' }]))
        .toEqual({ question: 'second', earlierQuestion: undefined })
    })

    it('adds the earlier question when answering a clarifying question', () => {
        expect(pickQuestion([{ role: 'user', text: 'What do I do with this?' }, { role: 'assistant', text: 'Which form?', kind: 'clarify' }, { role: 'user', text: 'the TFN one' }]))
        .toEqual({ question: 'the TFN one', earlierQuestion: 'What do I do with this?' })
    })

    it('returns nothing when there is no user turn', () => {
        expect(pickQuestion([{ role: 'assistant', text: 'Hello!' }])).toEqual({})
    })
})

describe('toHistory', () => {
    it('drops an error bubble together with the question that caused it', () => {
        // "Try again" was pressed after the follow-up failed, so the question is on screen twice.
        const history = toHistory([
            { role: 'user', text: 'What do I do with this?' },
            { role: 'assistant', text: 'Which form?', kind: 'clarify' },
            { role: 'user', text: 'the TFN one' },
            { role: 'assistant', text: 'Something went wrong.', kind: 'error' },
            { role: 'user', text: 'the TFN one' },
        ])
        expect(history.map((t) => t.text)).toEqual(['What do I do with this?', 'Which form?', 'the TFN one'])
        // ...so the retry is still understood as a follow-up.
        expect(pickQuestion(history)).toEqual({ question: 'the TFN one', earlierQuestion: 'What do I do with this?' })
    })

    it('sends only the most recent turns, however long the chat is', () => {
        const long = Array.from({ length: 80 }, (_, i) =>
            i % 2 === 0
                ? { role: 'user' as const, text: `question ${i}` }
                : { role: 'assistant' as const, text: `answer ${i}`, kind: 'answer' as const }
        )
        const history = toHistory([...long, { role: 'user', text: 'latest' }])
        expect(history.length).toBeLessThanOrEqual(6)
        expect(history.at(-1)).toEqual({ role: 'user', text: 'latest' })
    })
})