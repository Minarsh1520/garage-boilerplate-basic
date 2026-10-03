'use server'

import { adminDb } from '@/lib/firebase/admin'
import { requireAdmin } from '@/actions/auth.actions'

export type EscalationCase = {
  id: string
  type?: string
  title?: string
  employeeName?: string
  employeeId?: string
  summary?: string
  status?: string
  createdAt?: string
}

export async function getEscalationCases(): Promise<EscalationCase[]> {
  await requireAdmin()

  const snapshot = await adminDb
    .collection('escalationCases')
    .orderBy('createdAt', 'desc')
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()

    return {
      id: doc.id,
      type: data.type,
      title: data.title,
      employeeName: data.employeeName,
      employeeId: data.employeeId,
      summary: data.summary,
      status: data.status,
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : undefined,
    }
  })
}