import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BotMessageSquare,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Employee Onboarding',
  description: 'A simple and supported employee onboarding experience.',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#F7F9FC] to-[#E8F0F8] text-[#222222]">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes floatCard {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes fillProgress {
          from { width: 0%; }
          to { width: 65%; }
        }

        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }

        .landing-fade-1 { animation: fadeUp 0.6s ease-out both; }
        .landing-fade-2 { animation: fadeUp 0.6s ease-out 0.12s both; }
        .landing-fade-3 { animation: fadeUp 0.6s ease-out 0.24s both; }
        .landing-float { animation: floatCard 4s ease-in-out infinite; }
        .landing-progress { animation: fillProgress 1.6s ease-out 0.7s both; }
        .landing-task-1 { animation: popIn 0.45s ease-out 1s both; }
        .landing-task-2 { animation: popIn 0.45s ease-out 1.25s both; }
        .landing-task-3 { animation: popIn 0.45s ease-out 1.5s both; }
        .landing-ai { animation: popIn 0.5s ease-out 1.8s both; }
      `}</style>

      {/* Header */}
      <header className="relative z-20 border-b border-[#D7E2EE] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4361AB] text-white">
              <UserRoundCheck className="h-5 w-5" />
            </div>

            <span className="text-lg font-bold text-[#222222] sm:text-xl">
              Employee Onboarding
            </span>
          </div>

          <Link
            href="/auth/signin"
            className="rounded-md px-4 py-2 text-sm font-semibold text-[#4361AB] transition hover:bg-[#EEF3FA]"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="relative">
          <div className="pointer-events-none absolute left-[-120px] top-20 h-72 w-72 rounded-full bg-[#DDE8F2]/60 blur-3xl" />
          <div className="pointer-events-none absolute right-[-100px] top-48 h-80 w-80 rounded-full bg-[#C9D8E8]/50 blur-3xl" />

          <div className="relative mx-auto grid min-h-[650px] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-20">
            {/* Left */}
            <div className="max-w-xl">
              <div className="landing-fade-1 inline-flex items-center gap-2 rounded-full border border-[#C9D8E8] bg-white px-3 py-1.5 text-xs font-semibold text-[#4361AB] shadow-sm">
                <Sparkles className="h-4 w-4" />
                Your onboarding, made simple
              </div>

              <h1 className="landing-fade-1 mt-6 text-4xl font-bold leading-tight tracking-tight text-[#222222] sm:text-5xl lg:text-6xl">
                Start your new role
                <span className="block text-[#4361AB]">with confidence.</span>
              </h1>

              <p className="landing-fade-2 mt-6 max-w-lg text-base leading-7 text-[#555555] sm:text-lg">
                Complete your onboarding tasks, track your progress and get support from your AI Assistant — all in one place.
              </p>

              <div className="landing-fade-3 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4361AB] px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#36509A] hover:shadow-lg"
                >
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center rounded-lg border border-[#4361AB] bg-white px-6 py-3 text-sm font-bold text-[#4361AB] transition hover:bg-[#EEF3FA]"
                >
                  Sign In
                </Link>
              </div>

              <div className="landing-fade-3 mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#555555]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#4361AB]" />
                  Simple onboarding
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#4361AB]" />
                  Track your progress
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#4361AB]" />
                  AI-powered support
                </div>
              </div>
            </div>

            {/* Animated dashboard preview */}
            <div className="landing-float relative mx-auto w-full max-w-lg">
              <div className="absolute -left-6 -top-6 h-24 w-24 rounded-3xl bg-[#4361AB]/10" />
              <div className="absolute -bottom-7 -right-7 h-32 w-32 rounded-full bg-[#DDE8F2]" />

              <div className="relative overflow-hidden rounded-3xl border border-[#C9D8E8] bg-white shadow-2xl">
                <div className="border-b border-[#DDE8F2] bg-[#4361AB] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-white/75">Employee Onboarding</p>
                      <p className="mt-1 text-sm font-bold text-white">Welcome, Alex 👋</p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
                      AC
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#222222]">Onboarding Progress</p>
                        <p className="mt-1 text-xs text-[#777777]">Keep going, you're doing great.</p>
                      </div>

                      <span className="text-lg font-bold text-[#4361AB]">65%</span>
                    </div>

                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#E5E9EF]">
                      <div className="landing-progress h-full rounded-full bg-[#4361AB]" />
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#777777]">
                      Your Tasks
                    </p>

                    <div className="landing-task-1 flex items-center justify-between rounded-xl border border-[#DDE8F2] bg-[#F7F9FC] p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4361AB] text-white">
                          <Check className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-[#222222]">Personal Details</p>
                          <p className="text-xs text-[#777777]">Completed</p>
                        </div>
                      </div>

                      <span className="rounded-full bg-[#E8F1F8] px-2.5 py-1 text-[10px] font-bold text-[#4361AB]">
                        DONE
                      </span>
                    </div>

                    <div className="landing-task-2 flex items-center justify-between rounded-xl border border-[#DDE8F2] bg-[#F7F9FC] p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4361AB] text-white">
                          <Check className="h-4 w-4" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-[#222222]">Company Policies</p>
                          <p className="text-xs text-[#777777]">Completed</p>
                        </div>
                      </div>

                      <span className="rounded-full bg-[#E8F1F8] px-2.5 py-1 text-[10px] font-bold text-[#4361AB]">
                        DONE
                      </span>
                    </div>

                    <div className="landing-task-3 flex items-center justify-between rounded-xl border border-[#DDE8F2] bg-white p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#C9D8E8]">
                          <ClipboardCheck className="h-4 w-4 text-[#4361AB]" />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-[#222222]">Super Fund</p>
                          <p className="text-xs text-[#777777]">Due soon</p>
                        </div>
                      </div>

                      <span className="rounded-full bg-[#F1F3F6] px-2.5 py-1 text-[10px] font-bold text-[#666666]">
                        PENDING
                      </span>
                    </div>
                  </div>

                  {/* AI */}
                  <div className="landing-ai rounded-2xl bg-[#EEF3FA] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4361AB] text-white">
                        <BotMessageSquare className="h-5 w-5" />
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#222222]">Need some help?</p>
                        <p className="mt-1 text-xs leading-5 text-[#555555]">
                          Ask the AI Assistant about your onboarding tasks or workplace information.
                        </p>

                        <div className="mt-3 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4361AB]" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4361AB] [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4361AB] [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature cards */}
        <section className="border-t border-[#DDE8F2] bg-white/70">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-8 md:grid-cols-3">
            <Feature
              icon={<ClipboardCheck className="h-5 w-5" />}
              title="Know what to do"
              description="See your assigned onboarding tasks and what needs your attention next."
            />

            <Feature
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Track your progress"
              description="Stay up to date with your onboarding journey and completed requirements."
            />

            <Feature
              icon={<BotMessageSquare className="h-5 w-5" />}
              title="Get help quickly"
              description="Use the AI Assistant whenever you have questions during onboarding."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-[#DDE8F2] bg-white px-5 py-5 text-center text-xs text-[#777777]">
        Employee Onboarding Portal
      </footer>
    </div>
  )
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-[#DDE8F2] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF3FA] text-[#4361AB]">
        {icon}
      </div>

      <h2 className="mt-4 text-base font-bold text-[#222222]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#666666]">{description}</p>
    </div>
  )
}