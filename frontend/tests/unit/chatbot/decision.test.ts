import { describe, it, expect } from 'vitest'
import { parseDecision, buildPrompt } from '@/features/chatbot/lib/decision'

describe('parseDecision', () => {
    it('accepts a well-formed answer', () => {
        expect(parseDecision('{"outcome":"answer","text":"Within 30 days."}')).toEqual({ outcome: 'answer', text: 'Within 30 days.' })
    })

    it('keeps category and pathway on an escalation', () => {
        expect(parseDecision('{"outcome":"escalate","category":"wellbeing","pathway":"HR"}')).toMatchObject({ outcome: 'escalate', pathway: 'HR' })
    })

  // Everything below must end as the safe fallback, never as text shown to the employee.
    it.each([
        ['not JSON at all', 'ESCALATE'],
        ['empty reply', ''],
        ['undefined reply', undefined],
        ['unknown outcome', '{"outcome":"maybe"}'],
        ['answer with no text', '{"outcome":"answer"}'],
        ['answer with blank text', '{"outcome":"answer","text":"  "}'],
        ['invalid pathway', '{"outcome":"escalate","pathway":"Payroll"}'],
        ])('falls back on %s', (_label, raw) => {
        expect(parseDecision(raw)).toEqual({ outcome: 'not_found' })
    })
})

describe('buildPrompt', () => {
    it('only includes EARLIER QUESTION when there is one', () => {
    expect(buildPrompt({ question: 'q', policies: 'p', record: 'r' })).not.toContain('EARLIER QUESTION')
    expect(buildPrompt({ question: 'q', earlierQuestion: 'e', policies: 'p', record: 'r' })).toContain('EARLIER QUESTION: e')
    })
})