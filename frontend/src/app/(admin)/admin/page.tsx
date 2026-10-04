import Link from 'next/link'
import { FileText, CircleHelp, Users } from 'lucide-react'

const adminCards = [
  {
    title: 'Policy',
    description: 'Provide approved documents for the AI assistant to use',
    href: '/admin/policy',
    icon: FileText,
  },
  {
    title: 'Escalation Cases',
    description:
      "View matters that require human assistance that the assistant couldn't resolve",
    href: '/admin/cases',
    icon: CircleHelp,
  },
  {
    title: 'Employees',
    description:
      'Add a new employee and provide them with a default onboarding checklist',
    href: '/admin/employees',
    icon: Users,
  },
]

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-[#222222]">
        Admin Dashboard
      </h1>

      <div className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
        {adminCards.map(({ title, description, href, icon: Icon }) => (
          <div
            key={href}
            className="flex min-h-40 flex-col rounded-lg border border-gray-300 p-4"
          >
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-[#4361AB]" />

              <h2 className="text-lg font-bold text-[#222222]">
                {title}
              </h2>
            </div>

            <p className="mt-2 text-sm text-[#222222]">
              {description}
            </p>

            <div className="mt-auto flex justify-end pt-4">
              <Link
                href={href}
                className="rounded bg-[#4361AB] px-3 py-2 text-sm font-semibold text-white hover:bg-[#36509A]"
              >
                Go to page
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}