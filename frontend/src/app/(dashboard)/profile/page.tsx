import type { Metadata } from 'next'
import { getServerSession } from '@/actions/auth.actions'
import { ui } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Profile',
}

export default async function ProfilePage() {
  const session = await getServerSession()

  return (
    <div className={ui.page}>
      <h1 className={ui.pageTitle}>Profile</h1>
      <p className={ui.pageDescription}>Manage your account details.</p>

      <div className={`mt-6 max-w-2xl ${ui.card}`}>
        <p className={ui.label}>Email</p>
        <p className="mt-1 text-sm text-[#222222]">{session?.email ?? '—'}</p>
      </div>
    </div>
  )
}
