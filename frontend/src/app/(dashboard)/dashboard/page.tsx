import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { getEmployeeOnboarding } from '@/lib/onboarding'

export const metadata: Metadata = {
  title: 'Home',
}

export default async function DashboardPage() {
  const session = await getServerSession()
  const onboarding = session ? await getEmployeeOnboarding(session.uid) : null
  const profileSnap = session ? await adminDb.collection('users').doc(session.uid).get() : null

  const displayName = profileSnap?.exists
    ? (profileSnap.data()?.displayName as string | null)
    : null
  const greetingName = displayName ?? session?.email ?? null

  return (
    <div className="space-y-4 px-6 py-5">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-[#222222]">
          Home
        </h1>

        <p className="mt-1 text-sm text-[#222222]">
          Need Help? Interact with our{' '}
          <Link
            href="/chatbot"
            className="font-bold text-[#4361AB] underline"
          >
            AI Assistant
          </Link>
        </p>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[#222222]">
          Checklist
        </h2>

        {!onboarding || onboarding.checklist.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No onboarding data available.
          </p>
        ) : (
          <div className="mt-2 border-t border-zinc-500">
            {onboarding.checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between border-b border-zinc-500 py-3 px-1"
              >
                <div>
                  <p className="text-xl font-medium text-[#222222]">
                    {item.title}
                  </p>

                  <p className="mt-1 text-sm text-zinc-600">
                    {item.description}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-[#4361AB]">
                    {item.status.toUpperCase()}
                  </p>

                  <p className="mt-4 text-xs text-zinc-500">
                    Due in: {item.duein}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}