import type { Metadata } from 'next'
import { ui } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
  return (
    <div className={ui.page}>
      <h1 className={ui.pageTitle}>Settings</h1>
      <p className={ui.pageDescription}>Manage your application settings.</p>

      <div className={`mt-6 max-w-2xl ${ui.emptyBox}`}>Settings will appear here.</div>
    </div>
  )
}
