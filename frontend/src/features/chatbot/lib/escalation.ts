import { FieldValue } from 'firebase-admin/firestore'
import type { RagDeps } from '@/lib/rag/types'
import type { CaseCategory, Pathway } from '../types'
import { CASE_TITLES } from './case-titles'
import { daysBetween, todayIn } from './due-dates'
import { readOwnRecord } from './record'

// The Admin page reads this collection through getEscalationCases() in
// src/actions/escalation.actions.ts. The field names it reads are: type, title,
// employeeName, employeeId, summary, status, createdAt. Keep the two files in step.
export const ESCALATION_COLLECTION = 'escalationCases'

// Case priorities from the BA's rules (Sprint 3), stored as numbers so the Admin page can
// sort on them: 1 = High, 2 = Medium, 3 = Low (labels in src/lib/cases.ts).
//   High   sensitive HR concerns; can't reach a critical system before the start date
//   Medium outstanding documents or training, non-urgent access issues, approval requests
//   Low    general questions that need a person but aren't urgent
export const HIGH = 1
const PRIORITIES: Record<CaseCategory, 1 | 2 | 3> = {
    complaint: 1,
    wellbeing: 1,
    pay: 1,
    'employment-decision': 1,
    'system-access': 2, // High instead when it happens before the start date: see casePriority
    'onboarding-task': 2,
    'restricted-action': 2,
    other: 3,
    'no-policy': 3,
}

// An access problem on or before the start date blocks the employee's first day, so it is
// High. Without a known start date it stays Medium: never guessed upwards.
export function casePriority(category: CaseCategory, startDate: string | undefined, today: string): 1 | 2 | 3 {
    if (category === 'system-access' && startDate) {
        const days = daysBetween(today, startDate)
        if (days !== null && days >= 0) return HIGH
    }
    return PRIORITIES[category]
}

// Stops one employee filling the Admin page by pressing "Send" again and again.
// BA rule: three NON-URGENT cases per employee per rolling 24 hours. High-priority cases
// never count towards it and are never blocked by it, so an urgent or sensitive matter
// always has a way to a person. (The BA marked the number "needs clarification".)
export const MAX_CASES_PER_DAY = 3
const DAY_MS = 24 * 60 * 60 * 1000

export type CreateCaseResult =
    | { status: 'created'; caseId: string }
    | { status: 'daily-limit' }   // already MAX_CASES_PER_DAY non-urgent cases in the last 24 hours
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
    const mine = await collection.where('employeeUid', '==', input.uid).select('summary', 'createdAt', 'priority').get()
    const since = now() - DAY_MS
    const recent = mine.docs.filter((doc) => {
        const created = doc.get('createdAt')
        // A case saved a moment ago may not have its server timestamp yet: count it as recent.
        return !created?.toMillis || created.toMillis() >= since
    })

    // Asking twice gives the same case back, whatever its priority (BA: repeats are handled
    // without misleading the employee).
    const duplicate = recent.find((doc) => sameQuestion(String(doc.get('summary') ?? ''), input.question))
    if (duplicate) return { status: 'duplicate', caseId: duplicate.id }

    // Who the employee is comes from their own record, looked up by the session's uid.
    // If there is no record, the fields are left out: never invented (BA rule).
    const recordResult = await readOwnRecord(deps, input.uid)
    const record = recordResult.status === 'ok' ? recordResult.record : null
    const priority = casePriority(input.category, record?.startDate, todayIn(undefined, new Date(now())))

    // Only non-urgent cases count, and a High case is never stopped. A case saved before
    // priorities existed counts as non-urgent.
    const nonUrgent = recent.filter((doc) => doc.get('priority') !== HIGH)
    if (priority !== HIGH && nonUrgent.length >= MAX_CASES_PER_DAY) return { status: 'daily-limit' }

    const ref = await collection.add({
        // --- read by the Admin page ---
        type: input.pathway,                      // who should pick it up: HR, IT or Manager
        title: CASE_TITLES[input.category],
        summary: input.question,                  // the employee's own words
        status: 'open',                           // the only status that is true at creation
        createdAt: FieldValue.serverTimestamp(),  // the Admin page sorts on this
        priority,                                 // the Admin page sorts on this first
        ...(record?.employeeName ? { employeeName: record.employeeName } : {}),
        ...(record?.employeeId ? { employeeId: record.employeeId } : {}),
        // --- not shown yet, kept for the limit above and for auditing ---
        employeeUid: input.uid,
        category: input.category,
        _schemaVersion: 1,
    })
    return { status: 'created', caseId: ref.id }
}
