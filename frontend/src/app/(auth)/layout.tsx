import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication',
}

// Each auth page draws its own blue top bar and centred form (see the sign-in page), so
// this layout only provides a white page with dark text. No dark-mode colours: the app is
// designed for white.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen w-full bg-white text-[#222222]">{children}</div>
}
