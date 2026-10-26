import type { RagDeps } from '@/lib/rag/types'
import { EMPLOYEE_COLLECTION } from './record'

// "Mark a task completed" (BA: Restricted, only through the app's validated completion
// process). This file IS that process. The assistant can only OFFER it; the employee sees a
// preview and presses Confirm; then completeOwnTask() checks everything again and saves.

// Tasks the employee can't mark done themselves, because someone else completes them.
// The IT account is activated by IT at the setup session, not by the employee.
// The BA and the admin page owner own this list.
export const NOT_SELF_COMPLETABLE = new Set(['it-account'])

export interface ChecklistTask {
    id?: string
    title: string
    status: 'completed' | 'pending'
}

// The id the chat uses for a task: its id, or its title for a checklist written without ids.
export const taskRef = (task: ChecklistTask) => task.id ?? task.title

// Finds a task by id, or by title ignoring case and spacing (the AI names tasks by title).
export function findTask<T extends ChecklistTask>(checklist: T[] | undefined, ref: string): T | undefined {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
    const wanted = norm(ref)
    if (!wanted) return undefined
    return checklist?.find((t) => (t.id && norm(t.id) === wanted) || norm(t.title) === wanted)
}

export function canEmployeeComplete(task: ChecklistTask): boolean {
    return !NOT_SELF_COMPLETABLE.has(task.id ?? '') && task.title.trim().toLowerCase() !== 'it account'
}

export type TaskCheck = 'ok' | 'not-found' | 'already-completed' | 'not-allowed'

// The same check for the offer (before the preview) and for the save (after Confirm).
export function checkTask(task: ChecklistTask | undefined): TaskCheck {
    if (!task) return 'not-found'
    if (task.status === 'completed') return 'already-completed'
    if (!canEmployeeComplete(task)) return 'not-allowed'
    return 'ok'
}

export type CompleteTaskResult = { status: TaskCheck | 'no-record'; title?: string }

// Marks ONE of the signed-in employee's own pending tasks as completed.
// - uid comes from the session, so only their own record can be changed.
// - Runs in a transaction: the record is read and written as one step, so two clicks, or
//   an admin editing the record at the same moment, can't overwrite each other.
// - Keeps the record's summary fields in step with the checklist, the same way the seed
//   script builds them, so the Home page can't show two different answers.
// Throws if Firestore fails: the caller must then say it was NOT saved.
export async function completeOwnTask(
    deps: Pick<RagDeps, 'db'>,
    uid: string,
    ref: string,
    now: () => Date = () => new Date()
): Promise<CompleteTaskResult> {
    const docRef = deps.db.doc(`${EMPLOYEE_COLLECTION}/${uid}`)
    return deps.db.runTransaction(async (tx) => {
        const snapshot = await tx.get(docRef)
        if (!snapshot.exists) return { status: 'no-record' as const }
        const data = snapshot.data() ?? {}
        const checklist: (ChecklistTask & Record<string, unknown>)[] = Array.isArray(data.checklist) ? data.checklist : []
        const task = findTask(checklist, ref)
        const check = checkTask(task)
        if (check !== 'ok' || !task) return { status: check, title: task?.title }

        const updated = checklist.map((t) =>
            t === task ? { ...t, status: 'completed', completedAt: now().toISOString(), completedVia: 'assistant' } : t
        )
        const stillPending = updated.some((t) => t.status === 'pending')
        tx.update(docRef, {
            checklist: updated,
            onboardingStatus: stillPending ? 'In Progress' : 'Completed',
            ...(task.id === 'training' ? { mandatoryTrainingStatus: 'completed' } : {}),
        })
        return { status: 'ok' as const, title: task.title }
    })
}
