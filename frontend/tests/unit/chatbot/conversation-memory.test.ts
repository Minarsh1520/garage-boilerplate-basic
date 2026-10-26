import { describe, it, expect, vi } from 'vitest'
import { buildPrompt } from '@/features/chatbot/lib/decision'
import { fallbackTitle, toExchanges } from '@/features/chatbot/lib/conversations'
import { isFollowUp } from '@/features/chatbot/lib/follow-up'
import { buildSummaryInput, writeSummary } from '@/features/chatbot/lib/summary'
import type { GenAI } from '@/lib/rag/gemini-pool'
import type { SavedMessage } from '@/features/chatbot/types'

describe('isFollowUp', () => {
    it('spots questions that lean on the one before', () => {
        expect(isFollowUp('And for part-timers?')).toBe(true)
        expect(isFollowUp('What about sick leave?')).toBe(true)
        expect(isFollowUp('Who approves it?')).toBe(true)
        expect(isFollowUp('When is that due?')).toBe(true)
    })

    it('leaves stand-alone questions alone, so the search does not drift back to the old topic', () => {
        expect(isFollowUp('How do I set up my IT account?')).toBe(false)
        expect(isFollowUp('When do I need to complete mandatory training modules in the Learning Hub?')).toBe(false)
    })
})

describe('toExchanges', () => {
    const m = (role: 'user' | 'assistant', text: string): SavedMessage => ({ id: text, role, text })

    it('pairs each question with its answer and keeps only the last ones', () => {
        const messages = [m('user', 'q1'), m('assistant', 'a1'), m('user', 'q2'), m('assistant', 'a2'), m('user', 'q3'), m('assistant', 'a3')]
        expect(toExchanges(messages)).toEqual([
            { question: 'q2', answer: 'a2' },
            { question: 'q3', answer: 'a3' },
        ])
    })

    it('skips a question that has no answer', () => {
        expect(toExchanges([m('user', 'q1'), m('user', 'q2'), m('assistant', 'a2')])).toEqual([{ question: 'q2', answer: 'a2' }])
    })
})

describe('fallbackTitle', () => {
    it('uses the first question, shortened', () => {
        expect(fallbackTitle('How do I request leave?', { kind: 'answer' })).toBe('How do I request leave?')
        expect(fallbackTitle('x'.repeat(100), { kind: 'answer' })).toHaveLength(60)
    })

    it('never puts a sensitive question in the list, where others may see the screen', () => {
        expect(fallbackTitle('I want to make a complaint about my manager', { kind: 'escalate' })).toBe('Question for a person')
    })
})

describe('buildPrompt with a conversation', () => {
    it('marks the first turn, and passes key points and recent exchanges', () => {
        const prompt = buildPrompt({
            question: 'and for part-timers?',
            policies: 'p',
            record: 'r',
            conversation: { isFirstTurn: false, keyPoints: 'Leave types', recent: [{ question: 'What leave do I get?', answer: 'a'.repeat(1000) }] },
        })
        expect(prompt).toContain('FIRST TURN: no')
        expect(prompt).toContain('KEY POINTS: Leave types')
        expect(prompt).toContain('Q: What leave do I get?')
        // Earlier answers are cut short, so long conversations don't resend whole answers.
        expect(prompt).not.toContain('a'.repeat(401))
    })

    it('treats a missing conversation as the first turn', () => {
        expect(buildPrompt({ question: 'q', policies: 'p', record: 'r' })).toContain('FIRST TURN: yes')
    })
})

describe('conversation summary (option C)', () => {
    const m = (role: 'user' | 'assistant', text: string, kind?: SavedMessage['kind']): SavedMessage => ({ id: text, role, text, kind })

    it('marks matters passed to a person, so the summary can leave their details out', () => {
        const input = buildSummaryInput([m('user', 'I want to complain'), m('assistant', 'This needs a person.', 'escalate'), m('user', 'Leave?'), m('assistant', 'b'.repeat(900), 'answer')])
        expect(input).toContain('ASSISTANT (passed to a person): This needs a person.')
        expect(input).not.toContain('b'.repeat(601)) // long answers are cut short
    })

    it('makes one AI request and returns its summary, without saving anything itself', async () => {
        const generateContent = vi.fn(async () => ({ text: JSON.stringify({ summary: '- Asked how to request leave: use My Leave.' }) }))
        const ai = { models: { generateContent, embedContent: vi.fn() } } as unknown as GenAI
        expect(await writeSummary(ai, [m('user', 'q'), m('assistant', 'a')])).toBe('- Asked how to request leave: use My Leave.')
        expect(generateContent).toHaveBeenCalledTimes(1)
    })

    it('refuses a reply in the wrong shape instead of saving nonsense', async () => {
        const ai = { models: { generateContent: async () => ({ text: '{"nope":1}' }), embedContent: vi.fn() } } as unknown as GenAI
        await expect(writeSummary(ai, [m('user', 'q'), m('assistant', 'a')])).rejects.toThrow()
    })
})

