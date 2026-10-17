import { z } from 'zod'
import type { RagDeps } from '@/lib/rag/types'
import { describeDue, sortTasksByUrgency } from './due-dates'

// The employee record lives in `employeeData/{uid}`. Its shape is owned by
// src/lib/onboarding.ts (EmployeeOnboarding), which the Home page checklist also reads,
// so the chat and the checklist can never show different data.
// That helper isn't called here because it imports the Next.js-only Admin connection;
// this file takes `deps` so the probe script and the unit tests can run it too.
export const EMPLOYEE_COLLECTION = 'employeeData'

// Validated like user input (same idea as chunkSchema in retrieve.ts): a record created
// with a different shape, or edited by hand, must not crash the chat.
// Every field is optional so ONE missing part doesn't throw away the rest.
const recordSchema = z.object({
    employeeId: z.string().optional(),
    employeeName: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    manager: z.string().optional(),
    startDate: z.string().optional(),
    checklist: z
        .array(z.object({ id: z.string().optional(), title: z.string(), status: z.enum(['completed', 'pending']), duein: z.string().optional() }))
        .optional(),
})
export type EmployeeRecord = z.infer<typeof recordSchema>

export type RecordResult =
    | { status: 'ok'; record: EmployeeRecord }
    | { status: 'missing' }     // no document for this employee
    | { status: 'malformed' }   // a document exists but isn't the shape we expect

// Only ever the SIGNED-IN user's record: the uid comes from the verified session,
// never from the question, so no one can request another employee's data.
export async function readOwnRecord(deps: Pick<RagDeps, 'db'>, uid: string): Promise<RecordResult> {
    const snapshot = await deps.db.doc(`${EMPLOYEE_COLLECTION}/${uid}`).get()
    if (!snapshot.exists) return { status: 'missing' }
    const parsed = recordSchema.safeParse(snapshot.data())
    if (!parsed.success) {
        // Field names only, never the values: this is employee data going into a log.
        console.error(`[chat] employee record for ${uid} is malformed:`, parsed.error.issues.map((i) => i.path.join('.')))
        return { status: 'malformed' }
    }
    return { status: 'ok', record: parsed.data }
}

const UNKNOWN = 'not available'

// Only the fields an answer might need (minimum necessary employee data).
// A missing part is written as "not available", NOT left out or defaulted to empty:
// an empty task list would read to the model as "nothing outstanding".
// The record's separate status fields (itAccountStatus, mandatoryTrainingStatus,
// onboardingStatus) are deliberately not sent: they repeat the checklist, and if the two
// ever disagree the model would have no way to know which is right.
export function formatRecord(record: EmployeeRecord, today?: string): string {
    // With today's date, pending tasks are listed soonest due first and each gets the due
    // date worked out by code (due-dates.ts), so "what's most urgent?" never depends on
    // the model doing date maths.
    const tasks = record.checklist?.length
        ? '\n' +
          (today ? sortTasksByUrgency(record.checklist, record.startDate, today) : record.checklist.map((task) => ({ task, dueDate: null })))
              .map(({ task: t, dueDate }) => {
                  const due = t.duein ? ` (due: ${t.duein}` + (dueDate && today && t.status === 'pending' ? `, ${dueDate}, ${describeDue(dueDate, today)}` : '') + ')' : ''
                  return `- ${t.title}: ${t.status}${due}`
              })
              .join('\n')
        : ` ${UNKNOWN}`
    return [
        `Name: ${record.employeeName ?? UNKNOWN}`,
        `Role: ${record.jobTitle ?? UNKNOWN}`,
        `Department: ${record.department ?? UNKNOWN}`,
        `Manager: ${record.manager ?? UNKNOWN}`,
        `Start date: ${record.startDate ?? UNKNOWN}`,
        `Onboarding tasks:${tasks}`,
    ].join('\n')
}
