import Link from 'next/link'
import {
  Shield,
  FileText,
  CircleHelp,
  Users,
  BotMessageSquare,
} from 'lucide-react'

const adminNavItems = [
  {
    href: '/admin',
    label: 'Admin',
    icon: Shield,
  },
  {
    href: '/admin/policy',
    label: 'Policy',
    icon: FileText,
  },
  {
    href: '/admin/cases',
    label: 'Cases',
    icon: CircleHelp,
  },
  {
    href: '/admin/employees',
    label: 'Employees',
    icon: Users,
  },
  {
    href: '/chatbot',
    label: 'Assistant',
    icon: BotMessageSquare,
  },
]

export function AdminSidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-44 flex-col border-r-4 border-[#4361AB] bg-[#DDE8F2] lg:flex">
        <nav className="flex-1 space-y-2 p-4">
          {adminNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="
                flex items-center gap-3
                px-2 py-2
                text-base font-semibold text-[#4361AB]
                transition-colors hover:underline
              "
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[#4361AB] bg-[#DDE8F2] lg:hidden">
        {adminNavItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
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