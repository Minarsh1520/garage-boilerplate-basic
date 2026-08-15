import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      {/* `flex items-center justify-center` + `max-w-sm` combo was clipping their
      full-width header down to a 384px column at every screen size, which is
      why the page looked mobile-only even on a desktop browser. */}
      {/*Adding bg-white here flip the color scheme on sign up page, hence it is gone*/}
      <div className="w-full">{children}</div>
    </div>
  )
}
