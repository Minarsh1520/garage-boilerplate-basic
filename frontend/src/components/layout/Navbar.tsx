'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Menu, User, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { navItems } from './Sidebar'

export function Navbar() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Escape closes the mobile drawer, matching standard dialog behavior
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  const handleSignOut = async () => {
    await signOut()
    router.replace('/auth/signin')
    router.refresh()
  }

  return (
    <>
      <header className="flex h-14 items-center justify-between bg-[#4361AB] px-4 sm:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <span className="text-2xl font-bold text-white sm:text-3xl">
            Employee Onboarding
          </span>
        </div>

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden text-sm text-white/90 sm:block">
              {user.email}
            </span>
          )}

          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 flex w-60 flex-col bg-[#DDE8F2] shadow-xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-[#4361AB] px-4">
              <span className="text-sm font-semibold text-[#4361AB]">
                Employee Onboarding
              </span>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#4361AB] transition-colors hover:bg-white/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-2 p-4">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-2 py-2 text-sm font-semibold text-[#4361AB] transition-colors hover:underline"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}