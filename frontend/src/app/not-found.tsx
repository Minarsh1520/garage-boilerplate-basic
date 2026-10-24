import Link from 'next/link'
import { ui } from '@/lib/theme'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#222222]">
      <header className={ui.topBar}>
        <p className={ui.topBarTitle}>Employee Onboarding</p>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-6xl font-bold text-[#DDE8F2]">404</p>
        <h1 className="text-2xl font-bold text-[#222222]">Page not found</h1>
        <p className="text-sm text-gray-600">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className={`mt-3 ${ui.buttonPrimary}`}>
          Go home
        </Link>
      </main>
    </div>
  )
}
