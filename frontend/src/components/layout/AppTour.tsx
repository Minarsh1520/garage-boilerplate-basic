'use client'

import { useEffect, useState } from 'react'
import { BotMessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AppTour() {
  const [step, setStep] = useState(1)
  const router = useRouter()

  useEffect(() => {
    const checklist = document.querySelector<HTMLElement>(
      '[data-tour="checklist"]'
    )

    const taskDetails = document.querySelector<HTMLElement>(
      '[data-tour="task-details"]'
    )

    const taskStatus = document.querySelector<HTMLElement>(
      '[data-tour="task-status"]'
    )

    const assistantLink = document.querySelector<HTMLElement>(
      '[data-tour="assistant-link"]'
    )

    const assistantNav = document.querySelector<HTMLElement>(
      '[data-tour="assistant-nav"]'
    )

    if (checklist) {
      checklist.style.zIndex = step === 2 ? '60' : ''
      checklist.style.backgroundColor = step === 2 ? 'white' : ''
    }

    if (taskDetails) {
      taskDetails.style.zIndex = step === 3 ? '60' : ''
      taskDetails.style.backgroundColor = step === 3 ? 'white' : ''
    }

    if (taskStatus) {
      taskStatus.style.zIndex = step === 4 ? '60' : ''
      taskStatus.style.backgroundColor = step === 4 ? 'white' : ''
    }

    if (assistantLink) {
      assistantLink.style.zIndex = step === 5 ? '60' : ''
      assistantLink.style.backgroundColor = step === 5 ? 'white' : ''
    }

    if (assistantNav) {
      assistantNav.style.zIndex = step === 5 ? '60' : ''
      assistantNav.style.backgroundColor = step === 5 ? 'white' : ''
    }

    return () => {
      if (checklist) {
        checklist.style.zIndex = ''
        checklist.style.backgroundColor = ''
      }

      if (taskDetails) {
        taskDetails.style.zIndex = ''
        taskDetails.style.backgroundColor = ''
      }

      if (taskStatus) {
        taskStatus.style.zIndex = ''
        taskStatus.style.backgroundColor = ''
      }

      if (assistantLink) {
        assistantLink.style.zIndex = ''
        assistantLink.style.backgroundColor = ''
      }

      if (assistantNav) {
        assistantNav.style.zIndex = ''
        assistantNav.style.backgroundColor = ''
      }
    }
  }, [step])

  if (step === 0) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/35" />

      {step === 1 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="w-[280px] rounded-lg border border-[#4361AB] bg-white px-6 py-5 text-center shadow-lg">
            <BotMessageSquare className="mx-auto h-12 w-12 text-[#4361AB]" />

            <h2 className="mt-3 text-xl font-bold text-[#222222]">
              Welcome!
            </h2>

            <p className="mt-1 text-base text-[#222222]">
              Would you like to have a short tour?
            </p>

            <div className="mt-5 flex justify-center gap-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-md bg-[#4361AB] px-3 py-2 font-bold text-white hover:bg-[#3B579A]"
              >
                YES
              </button>

              <button
                type="button"
                onClick={() => setStep(0)}
                className="rounded-md border border-[#4361AB] px-3 py-2 font-bold text-[#222222] hover:bg-[#EEF3FA]"
              >
                NO
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Checklist
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                This is where your checklist is located.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]"
            >
              SKIP TOUR
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Checklist
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                It contains the title and description of each task assigned to you.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]"
            >
              SKIP TOUR
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Checklist
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                It also contains the status of your task, and when it's due.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]"
            >
              SKIP TOUR
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(5)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                AI Assistant
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                If you need any help when it comes to onboarding, chat with our AI assistant.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]"
            >
              SKIP TOUR
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(6)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                AI Assistant
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                We'll move to the assistant page now, click next!
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]"
            >
              SKIP TOUR
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => {setStep(7) 
                  router.push('/chatbot')
                }}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Chatbot Page
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                You can chat with our Assistant here!
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]"
            >
              SKIP TOUR
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setStep(6)
                  router.push('/dashboard')
                }}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(8)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 8 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                What can you do?
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                You can use it to:
              </p>

              <ul className="mt-1 list-disc pl-4 text-xs text-[#222222]">
                <li>Understand onboarding tasks</li>
                <li>Find relevant onboarding information</li>
                <li>Ask common onboarding questions</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="rounded px-2 py-1 text-[10px] text-zinc-500 hover:bg-[#EEF3FA] hover:text-[#4361AB]"
            >
              SKIP TOUR
            </button>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setStep(7)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}