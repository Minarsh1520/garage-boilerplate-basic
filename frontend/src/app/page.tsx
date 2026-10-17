import type { Metadata } from 'next'
import Link from 'next/link'
import { ui } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Employee onboarding with an AI assistant',
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#222222]">
      <header className={ui.topBar}>
        <p className={ui.topBarTitle}>Employee Onboarding</p>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="text-3xl font-bold text-[#222222]">Welcome</h1>

          <p className="text-sm text-[#222222]">
            Track your onboarding checklist and ask the AI Assistant about policies, leave, IT access and more.
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/auth/signin" className={ui.buttonPrimary}>
            Sign in
          </Link>

          <Link href="/auth/signup" className={ui.buttonSecondary}>
            Create account
          </Link>
        </div>
      </main>
    </div>
  )
}