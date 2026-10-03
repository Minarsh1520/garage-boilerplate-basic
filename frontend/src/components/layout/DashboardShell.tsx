import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { AppTour } from './AppTour'

export function DashboardShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Navbar showMobileMenu={false} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-white pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      <AppTour />
    </div>
  )
}