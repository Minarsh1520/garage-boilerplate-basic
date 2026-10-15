'use client'

import { useEffect, useState } from 'react'
import { BotMessageSquare, ChevronLeft, ChevronRight, CircleCheckBig } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/providers/AuthProvider'
import { completeAppTour } from '@/actions/auth.actions'

type TourMode = 'auto' | 'all' | 'home' | 'chatbot'

export function AppTour() {
  const [step, setStep] = useState(0)
  const [tourMode, setTourMode] = useState<TourMode>('auto')
  const [started, setStarted] = useState(false)
  const { user, profile, loading } = useAuthContext()
  const router = useRouter()

  if (!started && !loading && user && profile?.tourCompleted !== true) {
    setStarted(true)
    setTourMode('auto')
    setStep(1)
  }

  useEffect(() => {
    const handleStartTour = (event: Event) => {
      const section = (event as CustomEvent<{ section: 'all' | 'home' | 'chatbot' }>).detail.section
      setStarted(true)

      if (section === 'chatbot') {
        setTourMode('chatbot')
        setStep(7)
        router.push('/chatbot')
        return
      }

      setTourMode(section === 'home' ? 'home' : 'all')
      setStep(2)
      router.push('/dashboard')
    }

    window.addEventListener('start-app-tour', handleStartTour)
    return () => window.removeEventListener('start-app-tour', handleStartTour)
  }, [router])

  useEffect(() => {
    const checklist = document.querySelector<HTMLElement>('[data-tour="checklist"]')
    const taskDetails = document.querySelector<HTMLElement>('[data-tour="task-details"]')
    const taskStatus = document.querySelector<HTMLElement>('[data-tour="task-status"]')
    const assistantLink = document.querySelector<HTMLElement>('[data-tour="assistant-link"]')
    const assistantNav = document.querySelector<HTMLElement>('[data-tour="assistant-nav"]')
    const chatInput = document.querySelector<HTMLElement>('[data-tour="chat-input"]')
    const assistantResponse = document.querySelector<HTMLElement>('[data-tour="assistant-response"]')

    if (checklist) { checklist.style.zIndex = step === 2 ? '60' : ''; checklist.style.backgroundColor = step === 2 ? 'white' : '' }
    if (taskDetails) { taskDetails.style.zIndex = step === 3 ? '60' : ''; taskDetails.style.backgroundColor = step === 3 ? 'white' : '' }
    if (taskStatus) { taskStatus.style.zIndex = step === 4 ? '60' : ''; taskStatus.style.backgroundColor = step === 4 ? 'white' : '' }
    if (assistantLink) { assistantLink.style.zIndex = step === 5 ? '60' : ''; assistantLink.style.backgroundColor = step === 5 ? 'white' : '' }
    if (assistantNav) { assistantNav.style.zIndex = step === 5 ? '60' : ''; assistantNav.style.backgroundColor = step === 5 ? 'white' : '' }
    if (chatInput) chatInput.style.zIndex = step === 11 ? '60' : ''
    if (assistantResponse) assistantResponse.style.zIndex = step === 13 ? '60' : ''

    return () => {
      if (checklist) { checklist.style.zIndex = ''; checklist.style.backgroundColor = '' }
      if (taskDetails) { taskDetails.style.zIndex = ''; taskDetails.style.backgroundColor = '' }
      if (taskStatus) { taskStatus.style.zIndex = ''; taskStatus.style.backgroundColor = '' }
      if (assistantLink) { assistantLink.style.zIndex = ''; assistantLink.style.backgroundColor = '' }
      if (assistantNav) { assistantNav.style.zIndex = ''; assistantNav.style.backgroundColor = '' }
      if (chatInput) chatInput.style.zIndex = ''
      if (assistantResponse) assistantResponse.style.zIndex = ''
    }
  }, [step])

  useEffect(() => {
    const handleResponseReady = () => { if (step === 11) setStep(12) }
    window.addEventListener('tour-response-ready', handleResponseReady)
    return () => window.removeEventListener('tour-response-ready', handleResponseReady)
  }, [step])

  if (step === 0) return null

  async function completeTour() {
    if (tourMode !== 'auto') {
      setStep(0)
      setTourMode('auto')
      return
    }

    const result = await completeAppTour()
    if (result.success) setStep(0)
  }

  const tourBox = 'fixed right-8 top-16 z-[70] w-[290px] rounded-xl border-2 border-[#4361AB] bg-white p-5 shadow-xl'

  return (
    <>
      {step !== 11 && step !== 12 && <div className="fixed inset-0 z-50 bg-black/35" />}

      {step === 1 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="w-[340px] rounded-xl border-2 border-[#4361AB] bg-white px-7 py-6 text-center shadow-xl">
            <BotMessageSquare className="mx-auto h-12 w-12 text-[#4361AB]" />
            <h2 className="mt-3 text-xl font-bold text-[#222222]">Welcome!</h2>
            <p className="mt-1 text-base text-[#222222]">Would you like to have a short tour?</p>

            <div className="mt-5 flex justify-center gap-6">
              <button type="button" onClick={() => setStep(2)} className="rounded-md bg-[#4361AB] px-3 py-2 font-bold text-white hover:bg-[#3B579A]">YES</button>
              <button type="button" onClick={() => void completeTour()} className="rounded-md border border-[#4361AB] px-3 py-2 font-bold text-[#222222] hover:bg-[#EEF3FA]">NO</button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Checklist</h3>
              <p className="mt-1 text-sm text-[#222222]">This is where your onboarding checklist is located.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <button type="button" onClick={() => setStep(3)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Task Details</h3>
              <p className="mt-1 text-sm text-[#222222]">Each task shows its title and description so you know what needs to be completed.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(2)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setStep(4)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Task Status</h3>
              <p className="mt-1 text-sm text-[#222222]">You can see whether a task is pending or completed and when it is due.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(3)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setStep(5)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">AI Assistant</h3>
              <p className="mt-1 text-sm text-[#222222]">If you need help with onboarding, you can open the AI Assistant from here.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>

            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(4)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>

              {tourMode === 'home' ? (
                <button type="button" onClick={() => void completeTour()} className="rounded-md bg-[#4361AB] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#36509A]">DONE</button>
              ) : (
                <button type="button" onClick={() => setStep(6)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">AI Assistant</h3>
              <p className="mt-1 text-sm text-[#222222]">Next, we&apos;ll move to the AI Assistant page.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(5)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => { setStep(7); router.push('/chatbot') }} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Chatbot Page</h3>
              <p className="mt-1 text-sm text-[#222222]">You can chat with the AI Assistant here.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>

            <div className="flex gap-1">
              {tourMode !== 'chatbot' && (
                <button type="button" onClick={() => { setStep(6); router.push('/dashboard') }} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              )}
              <button type="button" onClick={() => setStep(8)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 8 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">What Can It Do?</h3>
              <p className="mt-1 text-sm text-[#222222]">You can use it to:</p>
              <ul className="mt-2 list-disc pl-4 text-sm text-[#222222]">
                <li>Understand onboarding tasks</li>
                <li>Find onboarding information</li>
                <li>Ask common onboarding questions</li>
              </ul>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(7)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setStep(9)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 9 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Limitations & Escalation</h3>
              <p className="mt-1 text-sm text-[#222222]">Some questions may require human support.</p>
              <p className="mt-2 text-sm text-[#222222]">The Assistant will guide you when HR support is required.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(8)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setStep(10)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 10 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Try It</h3>
              <p className="mt-1 text-sm text-[#222222]">Let&apos;s try asking the Assistant an onboarding question.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(9)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setStep(11)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 11 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Ask a Question</h3>
              <p className="mt-1 text-sm text-[#222222]">Type an onboarding question into the Assistant below.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <button type="button" onClick={() => setStep(10)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      {step === 12 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Assistant Response</h3>
              <p className="mt-1 text-sm text-[#222222]">Here is the Assistant&apos;s response to your question.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(11)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setStep(13)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 13 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Personalised Help</h3>
              <p className="mt-1 text-sm text-[#222222]">The Assistant can use your available onboarding information to provide relevant help.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={() => void completeTour()} className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]">SKIP TOUR</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(12)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setStep(14)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 14 && (
        <div className={tourBox}>
          <div className="flex gap-3">
            <BotMessageSquare className="h-10 w-10 shrink-0 text-[#4361AB]" />
            <div>
              <h3 className="text-base font-bold text-[#222222]">Finish</h3>
              <p className="mt-1 text-sm text-[#222222]">That&apos;s all! You&apos;re ready to use the onboarding portal.</p>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <div className="flex gap-1">
              <button type="button" onClick={() => setStep(13)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setStep(15)} className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}

      {step === 15 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="w-[340px] rounded-xl border-2 border-[#4361AB] bg-white px-7 py-6 text-center shadow-xl">
            <CircleCheckBig className="mx-auto h-14 w-14 text-[#4361AB]" />
            <h2 className="mt-3 text-xl font-bold text-[#222222]">Tour Completed!</h2>
            <p className="mt-2 text-sm text-zinc-600">You can replay any part of the tour from Help.</p>

            <button
              type="button"
              onClick={async () => {
                const returnHome = tourMode === 'auto' || tourMode === 'all'
                await completeTour()
                if (returnHome) router.push('/dashboard')
              }}
              className="mt-5 rounded-md bg-[#4361AB] px-4 py-2 font-bold text-white hover:bg-[#3B579A]"
            >
              FINISH
            </button>
          </div>
        </div>
      )}
    </>
  )
}