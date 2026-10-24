import type { ReactNode } from 'react'
import { requireAdmin } from '@/actions/auth.actions'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Navbar } from '@/components/layout/Navbar'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAdmin()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Navbar showMobileMenu={false} />

      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />

        {/* text-[#222222] (Nihal's text colour) is set here for every page inside. globals.css
            turns page text near-white when the computer is in dark mode, but these pages stay
            white, so any text without its own colour faded out. */}
        <main className="flex-1 overflow-y-auto bg-white pb-20 text-[#222222] lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}