'use server'

import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/actions/auth.actions'
import { DEFAULT_PRIORITY, sortCasesForReview } from '@/lib/cases'

export type EscalationCase = {
  id: string
  type?: string
  title?: string
  employeeName?: string
  employeeId?: string
  summary?: string
  status?: string
  createdAt?: string
  priority: number // 1 = look at first. Older cases without one count as 3
}

export async function getEscalationCases(): Promise<EscalationCase[]> {
  await requireAdmin()

  const snapshot = await adminDb
    .collection('escalationCases')
    .orderBy('createdAt', 'desc')
    .get()

  const cases = snapshot.docs.map((doc) => {
    const data = doc.data()

    return {
      id: doc.id,
      type: data.type,
      title: data.title,
      employeeName: data.employeeName,
      employeeId: data.employeeId,
      summary: data.summary,
      status: data.status,
      priority: [1, 2, 3].includes(data.priority) ? data.priority : DEFAULT_PRIORITY,
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : undefined,
    }
  })

  return sortCasesForReview(cases)
}
