import Link from 'next/link'
import { House, BotMessageSquare, Shield } from 'lucide-react'

export const navItems = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: House,
  },
  {
    href: '/chatbot',
    label: 'Assistant',
    icon: BotMessageSquare,
  },
]

// Only shown to admins (see app/(dashboard)/layout.tsx). The Admin home page then links
// to Policy, Stored Answers, Escalation Cases and Employees.
const adminItem = {
  href: '/admin',
  label: 'Admin',
  icon: Shield,
}

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const items = isAdmin ? [...navItems, adminItem] : navItems

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-44 flex-col border-r-4 border-[#4361AB] bg-[#DDE8F2] lg:flex">
        <nav className="flex-1 space-y-2 p-4">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              data-tour={href === '/chatbot' ? 'assistant-nav' : undefined}
              className="
                relative flex items-center gap-3
                px-2 py-2
                text-lg font-semibold text-[#4361AB]
                transition-colors hover:underline
              "
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[#4361AB] bg-[#DDE8F2] lg:hidden">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            data-tour={href === '/chatbot' ? 'assistant-nav' : undefined}
            className="flex flex-1 flex-col items-center justify-center py-2 text-[#4361AB]"
          >
            <Icon className="h-4 w-4" />

            <span className="mt-1 text-[10px] font-medium">
              {label}
            </span>
          </Link>
        ))}
      </nav>
    </>
  )
}