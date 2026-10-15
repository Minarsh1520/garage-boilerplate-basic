import type { Metadata } from 'next'
import { getServerSession } from '@/actions/auth.actions'
import { getEmployeeOnboarding } from '@/lib/onboarding'
import { HelpMenu } from '@/components/HelpMenu'
import { ui } from '@/lib/theme'

export const metadata: Metadata = { title: 'Profile' }

function formatStatus(status?: string) { return status ? status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—' }
function formatDate(date?: string) { return date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' }

export default async function ProfilePage() {
  const session = await getServerSession()
  const onboarding = session?.uid ? await getEmployeeOnboarding(session.uid) : null
  const name = onboarding?.employeeName ?? session?.email ?? 'Employee'
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const totalTasks = onboarding?.checklist?.length ?? 0
  const completedTasks = onboarding?.checklist?.filter((task) => task.status === 'completed').length ?? 0
  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  const nextTask = onboarding?.checklist?.find((task) => task.status === 'pending')

  return (
    <div className={ui.page}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className={ui.pageTitle}>Profile</h1>
          <p className={ui.pageDescription}>View your personal and onboarding details.</p>
        </div>
        <HelpMenu />
      </div>

      <div className="mt-6 max-w-6xl">
        <div className={`p-6 ${ui.card}`}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4361AB] text-xl font-bold text-white">{initials}</div>
            <div>
              <h2 className="text-xl font-bold text-[#222222]">{name}</h2>
              <p className="mt-1 text-sm text-zinc-600">{onboarding?.jobTitle ?? 'Employee'}</p>
              <p className="mt-1 text-sm text-zinc-500">{onboarding?.employeeId ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            <div className={`p-6 ${ui.card}`}>
              <h2 className="text-lg font-bold text-[#222222]">Work Details</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Detail label="Department" value={onboarding?.department} />
                <Detail label="Manager" value={onboarding?.manager} />
                <Detail label="Location" value={onboarding?.location} />
                <Detail label="Start Date" value={formatDate(onboarding?.startDate)} />
              </div>
            </div>

            <div className={`p-6 ${ui.card}`}>
              <h2 className="text-lg font-bold text-[#222222]">Onboarding</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <Status label="Onboarding Status" value={formatStatus(onboarding?.onboardingStatus)} />
                <Status label="IT Account" value={formatStatus(onboarding?.itAccountStatus)} />
                <Status label="Mandatory Training" value={formatStatus(onboarding?.mandatoryTrainingStatus)} />
              </div>
            </div>

            <div className={`p-6 ${ui.card}`}>
              <h2 className="text-lg font-bold text-[#222222]">Account</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Detail label="Email" value={session?.email} />
                <Detail label="Account Type" value="Employee" />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className={`p-6 ${ui.card}`}>
              <h2 className="text-lg font-bold text-[#222222]">Onboarding Summary</h2>
              <p className="mt-4 text-3xl font-bold text-[#4361AB]">{progress}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-[#4361AB]" style={{ width: `${progress}%` }} /></div>
              <p className="mt-3 text-sm text-zinc-600">{completedTasks} of {totalTasks} tasks completed</p>

              <div className="mt-6 border-t border-gray-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Next Task</p>
                {nextTask ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-[#222222]">{nextTask.title}</p>
                    <p className="mt-1 text-sm text-zinc-600">{nextTask.description}</p>
                    <p className="mt-3 text-xs font-medium text-[#4361AB]">{nextTask.dueDate ? `Due ${formatDate(nextTask.dueDate)}` : `Due in ${nextTask.duein}`}</p>
                  </>
                ) : <p className="mt-2 text-sm text-zinc-600">All onboarding tasks completed.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-1 text-sm font-medium text-[#222222]">{value || '—'}</p></div>
}

function Status({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p><span className="mt-2 inline-block rounded-full bg-[#EAF0F8] px-3 py-1 text-xs font-semibold text-[#4361AB]">{value}</span></div>
}