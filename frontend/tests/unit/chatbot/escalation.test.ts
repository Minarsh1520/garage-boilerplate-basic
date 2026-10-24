import { describe, it, expect, vi } from 'vitest'
import type { RagDeps } from '@/lib/rag/types'
import { casePriority, createEscalationCase, MAX_CASES_PER_DAY, sameQuestion } from '@/features/chatbot/lib/escalation'

const NOW = Date.parse('2026-10-10T12:00:00Z')
const HOUR = 60 * 60 * 1000

// Fake Firestore that remembers what was saved. `earlier` = this employee's existing cases.
function fakeDb(record: object | null, earlier: { summary: string; at?: number; priority?: number }[] = []) {
    const add = vi.fn(async (doc: Record<string, unknown>) => ({ id: doc ? 'case123' : 'none' }))
    const docs = earlier.map((c, i) => ({
        id: `old${i}`,
        get: (field: string) =>
            field === 'summary' ? c.summary : field === 'priority' ? c.priority : c.at === undefined ? undefined : { toMillis: () => c.at },
    }))
    const deps = {
        db: {
            doc: () => ({ get: async () => ({ exists: record !== null, data: () => record }) }),
            collection: () => ({ add, where: () => ({ select: () => ({ get: async () => ({ docs }) }) }) }),
        },
    } as unknown as Pick<RagDeps, 'db'>
    return { deps, add, saved: () => add.mock.calls[0]?.[0] ?? {} }
}

const INPUT = { uid: 'u1', question: 'I want to make a complaint', category: 'complaint', pathway: 'HR' } as const
// A non-urgent request: the kind the daily limit applies to.
const ROUTINE = { uid: 'u1', question: 'Who do I ask about parking?', category: 'no-policy', pathway: 'HR' } as const
const create = (deps: Pick<RagDeps, 'db'>, input: Parameters<typeof createEscalationCase>[1] = INPUT) => createEscalationCase(deps, input, () => NOW)

describe('createEscalationCase', () => {
    it('saves every field the Admin page reads', async () => {
        const { deps, saved } = fakeDb({ employeeName: 'Alex Chen', employeeId: 'EMP001' })
        expect(await create(deps)).toEqual({ status: 'created', caseId: 'case123' })
        // The names getEscalationCases() in src/actions/escalation.actions.ts reads.
        expect(saved()).toMatchObject({
            type: 'HR',
            title: 'Workplace complaint or conflict',
            summary: 'I want to make a complaint',
            status: 'open',
            employeeName: 'Alex Chen',
            employeeId: 'EMP001',
            priority: 1,
        })
        expect(saved()).toHaveProperty('createdAt')
    })

    it('records who asked from the session uid and ranks a complaint first', async () => {
        const { deps, saved } = fakeDb({ employeeName: 'Alex Chen' })
        await create(deps)
        expect(saved()).toMatchObject({ employeeUid: 'u1', category: 'complaint', priority: 1 })
    })

    it('leaves the employee fields out, not invented, when there is no record', async () => {
        const { deps, saved } = fakeDb(null)
        await create(deps, { ...INPUT, category: 'no-policy' })
        expect(saved()).not.toHaveProperty('employeeName')
        expect(saved()).not.toHaveProperty('employeeId')
        expect(saved()).toMatchObject({ employeeUid: 'u1', priority: 3 })
    })

    it('throws when the save fails, so the caller cannot report success', async () => {
        const deps = {
            db: {
                doc: () => ({ get: async () => ({ exists: false }) }),
                collection: () => ({
                    where: () => ({ select: () => ({ get: async () => ({ docs: [] }) }) }),
                    add: async () => { throw new Error('unavailable') },
                }),
            },
        } as unknown as Pick<RagDeps, 'db'>
        await expect(create(deps)).rejects.toThrow()
    })

    it(`stops at ${MAX_CASES_PER_DAY} cases in 24 hours and saves nothing more`, async () => {
        const earlier = [{ summary: 'a', at: NOW - HOUR }, { summary: 'b', at: NOW - 2 * HOUR }, { summary: 'c', at: NOW - 3 * HOUR }]
        const { deps, add } = fakeDb(null, earlier)
        expect(await create(deps, ROUTINE)).toEqual({ status: 'daily-limit' })
        expect(add).not.toHaveBeenCalled()
    })

    it('never blocks a High-priority case, even after the limit (BA: urgent matters keep a way to a person)', async () => {
        const earlier = [{ summary: 'a', at: NOW - HOUR }, { summary: 'b', at: NOW - 2 * HOUR }, { summary: 'c', at: NOW - 3 * HOUR }]
        const { deps } = fakeDb(null, earlier)
        expect((await create(deps)).status).toBe('created') // INPUT is a complaint: High
    })

    it('does not count earlier High-priority cases towards the limit', async () => {
        const earlier = [
            { summary: 'a', at: NOW - HOUR, priority: 1 },
            { summary: 'b', at: NOW - 2 * HOUR, priority: 1 },
            { summary: 'c', at: NOW - 3 * HOUR, priority: 2 },
        ]
        const { deps } = fakeDb(null, earlier)
        expect((await create(deps, ROUTINE)).status).toBe('created')
    })

    it('does not count cases older than 24 hours', async () => {
        const earlier = [{ summary: 'a', at: NOW - 25 * HOUR }, { summary: 'b', at: NOW - 30 * HOUR }, { summary: 'c', at: NOW - 48 * HOUR }]
        const { deps } = fakeDb(null, earlier)
        expect((await create(deps)).status).toBe('created')
    })

    it('counts a case whose server time is not set yet as recent', async () => {
        const { deps } = fakeDb(null, [{ summary: 'a' }, { summary: 'b' }, { summary: 'c' }])
        expect((await create(deps, ROUTINE)).status).toBe('daily-limit')
    })

    it('gives back the earlier reference for the same question, instead of a second case', async () => {
        const { deps, add } = fakeDb(null, [{ summary: 'I want to make a complaint.', at: NOW - HOUR }])
        expect(await create(deps)).toEqual({ status: 'duplicate', caseId: 'old0' })
        expect(add).not.toHaveBeenCalled()
    })
})

describe('casePriority (BA: High / Medium / Low)', () => {
    const TODAY = '2026-10-17'
    it.each([
        ['complaint', 1],
        ['wellbeing', 1],
        ['pay', 1],
        ['employment-decision', 1],
        ['onboarding-task', 2],
        ['restricted-action', 2],
        ['other', 3],
        ['no-policy', 3],
    ] as const)('%s is priority %i', (category, priority) => {
        expect(casePriority(category, '2026-09-14', TODAY)).toBe(priority)
    })

    it('makes a system access problem High on or before the start date, Medium after it', () => {
        expect(casePriority('system-access', '2026-10-20', TODAY)).toBe(1)
        expect(casePriority('system-access', TODAY, TODAY)).toBe(1)
        expect(casePriority('system-access', '2026-09-14', TODAY)).toBe(2)
    })

    it('keeps a system access problem Medium when the start date is unknown, never guessing upwards', () => {
        expect(casePriority('system-access', undefined, TODAY)).toBe(2)
        expect(casePriority('system-access', 'next Monday', TODAY)).toBe(2)
    })

    it('saves the start-date priority on the case', async () => {
        const { deps, saved } = fakeDb({ employeeName: 'Sam Lee', startDate: '2026-10-20' })
        await create(deps, { uid: 'u1', question: 'I cannot log in to the onboarding system', category: 'system-access', pathway: 'IT' })
        expect(saved()).toMatchObject({ priority: 1, title: 'System access problem', type: 'IT' })
    })
})

describe('sameQuestion', () => {
    it('ignores case, spacing and end punctuation, but not different words', () => {
        expect(sameQuestion('How do I  request leave?', 'how do i request leave')).toBe(true)
        expect(sameQuestion('How do I request leave?', 'How do I cancel leave?')).toBe(false)
    })
})
