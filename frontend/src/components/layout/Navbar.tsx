'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Menu, User, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { navItems } from './Sidebar'

export function Navbar({ showMobileMenu = true }: { showMobileMenu?: boolean }) {
  const router = useRouter()
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)

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
        <div className="flex items-center gap-3">
          {showMobileMenu && (
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu" title="Menu" aria-expanded={menuOpen} className="flex h-8 w-8 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
          )}

          <span className="text-2xl font-bold text-white sm:text-3xl">Employee Onboarding</span>
        </div>

        <div className="flex-1" />

        <div className="relative flex items-center gap-3">
          {user && <span className="hidden text-sm text-white/90 sm:block">{user.email}</span>}

          {profile?.role !== 'admin' && (
            <Link href="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20" aria-label="Profile" title="Profile">
              <User className="h-4 w-4" />
            </Link>
          )}

          <button type="button" onClick={() => setSignOutOpen(!signOutOpen)} className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>

          {signOutOpen && (
            <div className="absolute right-0 top-11 z-[100] w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
              <p className="text-sm font-semibold text-[#222222]">Sign out?</p>
              <p className="mt-1 text-xs text-[#555555]">Are you sure you want to sign out?</p>

              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setSignOutOpen(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-[#222222] hover:bg-gray-50">Cancel</button>

                <button
                  type="button"
                  onClick={async () => {
                    setSignOutOpen(false)
                    await handleSignOut()
                  }}
                  className="rounded-md bg-[#4361AB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#36509A]"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {showMobileMenu && menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMenuOpen(false)} aria-hidden="true" />

          <aside role="dialog" aria-modal="true" aria-label="Navigation" className="fixed inset-y-0 left-0 flex w-60 flex-col bg-[#DDE8F2] shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[#4361AB] px-4">
              <span className="text-sm font-semibold text-[#4361AB]">Employee Onboarding</span>

              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu" title="Close menu" className="flex h-8 w-8 items-center justify-center rounded-md text-[#4361AB] transition-colors hover:bg-white/40">
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-2 p-4">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-2 py-2 text-sm font-semibold text-[#4361AB] transition-colors hover:underline">
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