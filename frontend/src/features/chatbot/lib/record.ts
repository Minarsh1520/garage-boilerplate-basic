import { z } from 'zod'
import type { RagDeps } from '@/lib/rag/types'

// The record is validated like user input (same idea as chunkSchema in retrieve.ts):
// a record seeded with a different shape, or edited by hand, must not crash the chat.
// Every field is optional so ONE missing part doesn't throw away the rest.
const recordSchema = z.object({
    employeeId: z.string().optional(),
    name: z.string().optional(),
    role: z.string().optional(),
    department: z.string().optional(),
    managerName: z.string().optional(),
    startDate: z.string().optional(),
    tasks: z.array(z.object({ label: z.string(), status: z.enum(['completed', 'pending']) })).optional(),
})
export type EmployeeRecord = z.infer<typeof recordSchema>

export type RecordResult =
    | { status: 'ok'; record: EmployeeRecord }
    | { status: 'missing' }     // no document for this employee
    | { status: 'malformed' }   // a document exists but isn't the shape we expect

// Only ever the SIGNED-IN user's record: the uid comes from the verified session,
// never from the question, so no one can request another employee's data.
export async function readOwnRecord(deps: RagDeps, uid: string): Promise<RecordResult> {
    const snapshot = await deps.db.doc(`onboardingProfiles/${uid}`).get()
    if (!snapshot.exists) return { status: 'missing' }
    const parsed = recordSchema.safeParse(snapshot.data())
    if (!parsed.success) {
        // Field names only, never the values: this is employee data going into a log.
        console.error(`[chat] onboarding record for ${uid} is malformed:`, parsed.error.issues.map((i) => i.path.join('.')))
        return { status: 'malformed' }
    }
    return { status: 'ok', record: parsed.data }
}

const UNKNOWN = 'not available'

// Only the fields an answer might need (minimum necessary employee data).
// A missing part is written as "not available", NOT left out or defaulted to empty:
// an empty task list would read to the model as "nothing outstanding".
export function formatRecord(record: EmployeeRecord): string {
    const tasks = record.tasks?.length ? '\n' + record.tasks.map((t) => `- ${t.label}: ${t.status}`).join('\n') : ` ${UNKNOWN}`
    return [
        `Name: ${record.name ?? UNKNOWN}`,
        `Role: ${record.role ?? UNKNOWN}`,
        `Department: ${record.department ?? UNKNOWN}`,
        `Manager: ${record.managerName ?? UNKNOWN}`,
        `Start date: ${record.startDate ?? UNKNOWN}`,
        `Onboarding tasks:${tasks}`,
    ].join('\n')
}