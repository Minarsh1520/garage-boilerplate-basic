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

// Stops one employee filling the Admin page by pressing "Send to HR team" again and again.
// The numbers are our guess; the BA may want different ones.
export const MAX_CASES_PER_DAY = 3
const DAY_MS = 24 * 60 * 60 * 1000

export type CreateCaseResult =
    | { status: 'created'; caseId: string }
    | { status: 'daily-limit' }   // already MAX_CASES_PER_DAY in the last 24 hours
    | { status: 'duplicate'; caseId: string } // the same question was sent in the last 24 hours

// Same question = same words once case, spacing and end punctuation are ignored.
export function sameQuestion(a: string, b: string): boolean {
    const norm = (s: string) => s.toLowerCase().replace(/[\s.?!]+/g, ' ').trim()
    return norm(a) === norm(b)
}

// The ONLY function that writes an escalation case.
// It throws if a read or the save fails: the caller must then tell the employee it was NOT sent.
export async function createEscalationCase(
    deps: Pick<RagDeps, 'db'>,
    input: { uid: string; question: string; category: CaseCategory; pathway: Pathway },
    now: () => number = Date.now
): Promise<CreateCaseResult> {
    const collection = deps.db.collection(ESCALATION_COLLECTION)

    // This employee's recent cases. Queried on employeeUid ONLY and filtered by date here in
    // code: adding a createdAt range to the query would need an extra composite index.
    // One employee has a handful of cases, so reading them all is cheap.
    const mine = await collection.where('employeeUid', '==', input.uid).select('summary', 'createdAt').get()
    const since = now() - DAY_MS
    const recent = mine.docs.filter((doc) => {
        const created = doc.get('createdAt')
        // A case saved a moment ago may not have its server timestamp yet: count it as recent.
        return !created?.toMillis || created.toMillis() >= since
    })

    const duplicate = recent.find((doc) => sameQuestion(String(doc.get('summary') ?? ''), input.question))
    if (duplicate) return { status: 'duplicate', caseId: duplicate.id }
    if (recent.length >= MAX_CASES_PER_DAY) return { status: 'daily-limit' }

    // Who the employee is comes from their own record, looked up by the session's uid.
    // If there is no record, the fields are left out: never invented (BA rule).
    const recordResult = await readOwnRecord(deps, input.uid)
    const record = recordResult.status === 'ok' ? recordResult.record : null

    const ref = await collection.add({
        // --- read by the Admin page ---
        type: input.pathway,                      // who should pick it up: HR, IT or Manager
        title: TITLES[input.category],
        summary: input.question,                  // the employee's own words
        status: 'open',                           // the only status that is true at creation
        createdAt: FieldValue.serverTimestamp(),  // the Admin page sorts on this
        priority: PRIORITIES[input.category],     // the Admin page sorts on this first
        ...(record?.employeeName ? { employeeName: record.employeeName } : {}),
        ...(record?.employeeId ? { employeeId: record.employeeId } : {}),
        // --- not shown yet, kept for the limit above and for auditing ---
        employeeUid: input.uid,
        category: input.category,
        _schemaVersion: 1,
    })
    return { status: 'created', caseId: ref.id }
}
