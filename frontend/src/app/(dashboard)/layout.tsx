import { redirect } from 'next/navigation'
import { getServerSession } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/auth/signin')

  // Admins sign in to the same Home page as employees, so they need a link to the Admin
  // area (Policy, Stored Answers, Cases, Employees). This only decides whether the link
  // is SHOWN: every admin page still checks the role itself with requireAdmin().
  // Same rule as requireAdmin(): users/{uid}.role must be 'admin'.
  const userSnap = await adminDb.collection('users').doc(session.uid).get()
  const isAdmin = userSnap.data()?.role === 'admin'

  return <DashboardShell isAdmin={isAdmin}>{children}</DashboardShell>
}
