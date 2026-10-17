import { describe, it, expect, vi } from 'vitest'
import type { RagDeps } from '@/lib/rag/types'
import { checkTask, completeOwnTask, findTask, type ChecklistTask } from '@/features/chatbot/lib/task-completion'

const CHECKLIST: (ChecklistTask & { duein: string })[] = [
    { id: 'tfn', title: 'TFN Declaration', status: 'completed', duein: 'Before your first day' },
    { id: 'super', title: 'Super Fund Nomination', status: 'pending', duein: '28 days from your start date' },
    { id: 'it-account', title: 'IT Account', status: 'pending', duein: 'Your first day' },
    { id: 'training', title: 'Mandatory Training', status: 'pending', duein: '30 days from your start date' },
]

// Fake Firestore with a transaction: `update` records what would be written.
function fakeDb(record: object | null) {
    const update = vi.fn()
    const docPath = vi.fn()
    const deps = {
        db: {
            doc: (path: string) => (docPath(path), { path }),
            runTransaction: async (run: (tx: unknown) => Promise<unknown>) =>
                run({ get: async () => ({ exists: record !== null, data: () => record }), update }),
        },
    } as unknown as Pick<RagDeps, 'db'>
    return { deps, update, docPath, written: () => update.mock.calls[0]?.[1] }
}

const NOW = () => new Date('2026-10-17T01:00:00Z')

describe('findTask and checkTask', () => {
    it('finds a task by id or by title, ignoring case and spacing', () => {
        expect(findTask(CHECKLIST, 'super')?.title).toBe('Super Fund Nomination')
        expect(findTask(CHECKLIST, '  super fund   NOMINATION ')?.id).toBe('super')
        expect(findTask(CHECKLIST, '')).toBeUndefined()
    })

    it('only allows the employee\'s own pending tasks that they complete themselves', () => {
        expect(checkTask(findTask(CHECKLIST, 'super'))).toBe('ok')
        expect(checkTask(findTask(CHECKLIST, 'tfn'))).toBe('already-completed')
        expect(checkTask(findTask(CHECKLIST, 'it-account'))).toBe('not-allowed')
        expect(checkTask(findTask(CHECKLIST, 'Payroll setup'))).toBe('not-found')
    })
})

describe('completeOwnTask', () => {
    it('marks the task completed in the signed-in employee\'s own record', async () => {
        const { deps, written, docPath } = fakeDb({ checklist: CHECKLIST, onboardingStatus: 'In Progress' })
        expect(await completeOwnTask(deps, 'u1', 'super', NOW)).toEqual({ status: 'ok', title: 'Super Fund Nomination' })
        expect(docPath).toHaveBeenCalledWith('employeeData/u1')
        const saved = written().checklist.find((t: { id: string }) => t.id === 'super')
        expect(saved).toMatchObject({ status: 'completed', completedAt: '2026-10-17T01:00:00.000Z', completedVia: 'assistant' })
        // Other tasks are untouched; tasks are still pending, so the record stays In Progress.
        expect(written().checklist.find((t: { id: string }) => t.id === 'tfn')).toEqual(CHECKLIST[0])
        expect(written().onboardingStatus).toBe('In Progress')
    })

    it('keeps the summary fields in step with the checklist', async () => {
        const lastOne = [{ id: 'training', title: 'Mandatory Training', status: 'pending' }]
        const { deps, written } = fakeDb({ checklist: lastOne, mandatoryTrainingStatus: 'pending' })
        await completeOwnTask(deps, 'u1', 'Mandatory Training', NOW)
        expect(written()).toMatchObject({ onboardingStatus: 'Completed', mandatoryTrainingStatus: 'completed' })
    })

    it.each([
        ['tfn', 'already-completed'],
        ['it-account', 'not-allowed'],
        ['someone-elses-task', 'not-found'],
    ])('changes nothing for %s (%s)', async (ref, status) => {
        const { deps, update } = fakeDb({ checklist: CHECKLIST })
        expect((await completeOwnTask(deps, 'u1', ref, NOW)).status).toBe(status)
        expect(update).not.toHaveBeenCalled()
    })

    it('changes nothing when the employee has no record', async () => {
        const { deps, update } = fakeDb(null)
        expect(await completeOwnTask(deps, 'u1', 'super', NOW)).toEqual({ status: 'no-record' })
        expect(update).not.toHaveBeenCalled()
    })

    it('throws when the save fails, so the caller cannot report success', async () => {
        const deps = {
            db: { doc: () => ({}), runTransaction: async () => { throw new Error('unavailable') } },
        } as unknown as Pick<RagDeps, 'db'>
        await expect(completeOwnTask(deps, 'u1', 'super', NOW)).rejects.toThrow()
    })
})
