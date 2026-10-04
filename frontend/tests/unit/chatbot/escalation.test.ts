import { describe, it, expect, vi } from 'vitest'
import type { RagDeps } from '@/lib/rag/types'
import { createEscalationCase } from '@/features/chatbot/lib/escalation'

// Fake Firestore that remembers what was saved.
function fakeDb(record: object | null) {
    const add = vi.fn(async (_doc: Record<string, unknown>) => ({ id: 'case123' }))
    const deps = {
        db: {
            doc: () => ({ get: async () => ({ exists: record !== null, data: () => record }) }),
            collection: () => ({ add }),
        },
    } as unknown as Pick<RagDeps, 'db'>
    return { deps, saved: () => add.mock.calls[0]?.[0] ?? {} }
}

const INPUT = { uid: 'u1', question: 'I want to make a complaint', category: 'complaint', pathway: 'HR' } as const

describe('createEscalationCase', () => {
    it('saves every field the Admin page reads', async () => {
        const { deps, saved } = fakeDb({ employeeName: 'Alex Chen', employeeId: 'EMP001' })
        expect(await createEscalationCase(deps, INPUT)).toBe('case123')
        // The names getEscalationCases() in src/actions/escalation.actions.ts reads.
        expect(saved()).toMatchObject({
            type: 'HR',
            title: 'Workplace complaint or conflict',
            summary: 'I want to make a complaint',
            status: 'open',
            employeeName: 'Alex Chen',
            employeeId: 'EMP001',
        })
        expect(saved()).toHaveProperty('createdAt')
    })

    it('records who asked from the session uid and ranks a complaint first', async () => {
        const { deps, saved } = fakeDb({ employeeName: 'Alex Chen' })
        await createEscalationCase(deps, INPUT)
        expect(saved()).toMatchObject({ employeeUid: 'u1', category: 'complaint', priority: 1 })
    })

    it('leaves the employee fields out, not invented, when there is no record', async () => {
        const { deps, saved } = fakeDb(null)
        await createEscalationCase(deps, { ...INPUT, category: 'no-policy' })
        expect(saved()).not.toHaveProperty('employeeName')
        expect(saved()).not.toHaveProperty('employeeId')
        expect(saved()).toMatchObject({ employeeUid: 'u1', priority: 3 })
    })

    it('throws when the save fails, so the caller cannot report success', async () => {
        const deps = {
            db: { doc: () => ({ get: async () => ({ exists: false }) }), collection: () => ({ add: async () => { throw new Error('unavailable') } }) },
        } as unknown as Pick<RagDeps, 'db'>
        await expect(createEscalationCase(deps, INPUT)).rejects.toThrow()
    })
})
