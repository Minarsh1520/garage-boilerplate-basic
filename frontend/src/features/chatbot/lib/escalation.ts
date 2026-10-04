import { FieldValue } from 'firebase-admin/firestore'
import type { RagDeps } from '@/lib/rag/types'
import type { CaseCategory, Pathway } from '../types'
import { readOwnRecord } from './record'

// The Admin page reads this collection through getEscalationCases() in
// src/actions/escalation.actions.ts. The field names it reads are: type, title,
// employeeName, employeeId, summary, status, createdAt. Keep the two files in step.
export const ESCALATION_COLLECTION = 'escalationCases'

// Shown as the case heading on the Admin page.
const TITLES: Record<CaseCategory, string> = {
    complaint: 'Workplace complaint or conflict',
    wellbeing: 'Wellbeing or personal circumstance',
    pay: 'Pay or salary matter',
    'employment-decision': 'Employment decision',
    'restricted-action': 'Request for an approval or record change',
    other: 'Needs a person',
    'no-policy': 'Question not covered by a policy',
}

// 1 = look at first. A made-up scheme for now: the BA owns the real one. Kept in this
// one place so changing it never touches anything else.
const PRIORITIES: Record<CaseCategory, 1 | 2 | 3> = {
    complaint: 1,
    wellbeing: 1,
    pay: 2,
    'employment-decision': 2,
    'restricted-action': 2,
    other: 3,
    'no-policy': 3,
}

// The ONLY function that writes an escalation case. Returns the new case's id.
// It throws if the save fails: the caller must then tell the employee it was NOT sent.
export async function createEscalationCase(
    deps: Pick<RagDeps, 'db'>,
    input: { uid: string; question: string; category: CaseCategory; pathway: Pathway }
): Promise<string> {
    // Who the employee is comes from their own record, looked up by the session's uid.
    // If there is no record, the fields are left out: never invented (BA rule).
    const recordResult = await readOwnRecord(deps, input.uid)
    const record = recordResult.status === 'ok' ? recordResult.record : null

    const ref = await deps.db.collection(ESCALATION_COLLECTION).add({
        // --- read by the Admin page ---
        type: input.pathway,                      // who should pick it up: HR, IT or Manager
        title: TITLES[input.category],
        summary: input.question,                  // the employee's own words
        status: 'open',                           // the only status that is true at creation
        createdAt: FieldValue.serverTimestamp(),  // the Admin page sorts on this
        ...(record?.employeeName ? { employeeName: record.employeeName } : {}),
        ...(record?.employeeId ? { employeeId: record.employeeId } : {}),
        // --- not shown yet, kept for sorting and auditing ---
        employeeUid: input.uid,
        category: input.category,
        priority: PRIORITIES[input.category],
        _schemaVersion: 1,
    })
    return ref.id
}
