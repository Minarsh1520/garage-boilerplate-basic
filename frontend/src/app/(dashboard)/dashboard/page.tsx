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

  const onboarding = session
    ? await getEmployeeOnboarding(session.uid)
    : null

  const profileSnap = session
    ? await adminDb.collection('users').doc(session.uid).get()
    : null

  const displayName = profileSnap?.exists
    ? (profileSnap.data()?.displayName as string | null)
    : null

  const greetingName =
    onboarding?.employeeName ??
    displayName ??
    session?.email ??
    'Employee'

  const totalTasks = onboarding?.checklist.length ?? 0

  const completedTasks =
    onboarding?.checklist.filter(
      (item) => item.status === 'completed'
    ).length ?? 0

  const progress =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6">
      {/* Heading */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#222222] sm:text-4xl">
          Home
        </h1>

        <p className="mt-1 text-base font-medium text-[#222222]">
          Welcome, {greetingName}
        </p>

        <p className="mt-1 text-sm text-[#222222]">
          Need Help? Interact with our{' '}
          <Link
            href="/chatbot"
            data-tour="assistant-link"
            className="relative inline-block rounded px-2 py-1 font-bold text-[#4361AB] underline"
          >
            AI Assistant
          </Link>
        </p>
      </div>

      {/* Progress */}
      {onboarding && totalTasks > 0 && (
        <div className="max-full">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#222222]">
              Onboarding Progress
            </h2>

            <span className="text-sm font-semibold text-[#4361AB]">
              {progress}%
            </span>
          </div>

          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-[#4361AB] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-2 text-sm text-zinc-600">
            {completedTasks} of {totalTasks} tasks completed
          </p>
        </div>
      )}

      {/* Checklist */}
      <div
        data-tour="checklist"
        className="relative"
      >
        <h2 className="text-2xl font-bold text-[#222222]">
          Checklist
        </h2>

        {!onboarding || onboarding.checklist.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No onboarding data available.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {onboarding.checklist.map((item, index) => (
              <div
                key={item.id}
                className="rounded-lg border border-[#C9D8E8] bg-[#F4F7FB] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div data-tour={index === 0 ? 'task-details' : undefined} className="relative">
                    <p className="text-base font-semibold text-[#222222]">
                      {item.title}
                    </p>

                    <p className="mt-1 text-sm text-[#555555]">
                      {item.description}
                    </p>
                  </div>

                  <div
                    data-tour={index === 0 ? 'task-status' : undefined}
                    className="relative shrink-0 text-right"
                  >
                    <p className="text-xs font-bold text-[#4361AB]">
                      {item.status.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#D8E2F0] pt-3">
                  <p className="text-xs font-medium text-[#555555]">
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