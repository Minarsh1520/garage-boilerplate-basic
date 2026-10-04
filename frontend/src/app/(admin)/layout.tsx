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

        <main className="flex-1 overflow-y-auto bg-white pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}