'use client'

import { useEffect, useState } from 'react'
import { BotMessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'

export function AppTour() {
  const [step, setStep] = useState(1)

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
                It also contains the status of your task, and when it&apos;s due.
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