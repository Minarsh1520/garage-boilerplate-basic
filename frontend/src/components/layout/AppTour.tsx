'use client'

import { useEffect, useState } from 'react'
import { BotMessageSquare, ChevronLeft, ChevronRight, CircleCheckBig } from 'lucide-react'
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

    const chatInput = document.querySelector<HTMLElement>(
      '[data-tour="chat-input"]'
    )

    const assistantResponse = document.querySelector<HTMLElement>(
      '[data-tour="assistant-response"]'
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

    if (chatInput) {
      chatInput.style.zIndex = step === 11 ? '60' : ''
    }

    if (assistantResponse) {
      assistantResponse.style.zIndex = step === 13 ? '60' : ''
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

      if (chatInput) {
        chatInput.style.zIndex = ''
      }

      if (assistantResponse) {
        assistantResponse.style.zIndex = ''
      }
    }
  }, [step])

  useEffect(() => {
    const handleResponseReady = () => {
      if (step === 11) {
        setStep(12)
      }
    }

    window.addEventListener('tour-response-ready', handleResponseReady)

    return () => {
      window.removeEventListener('tour-response-ready', handleResponseReady)
    }
  }, [step])

  if (step === 0) return null

  return (
    <>
      {step !== 11 && step !== 12 && (
        <div className="fixed inset-0 z-50 bg-black/35" />
      )}

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
                onClick={() => setStep(9)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 9 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Limitations & Escalation
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                In cases where:
              </p>

              <ul className="mt-1 list-disc pl-4 text-xs text-[#222222]">
                <li>It can&apos;t answer a certain question</li>
                <li>The question requires human judgement</li>
              </ul>

              <p className="mt-2 text-xs text-[#222222]">
                It will then send a ticket to HR.
              </p>

              <p className="mt-2 text-xs text-[#222222]">
                With your permission, of course.
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
                onClick={() => setStep(8)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(10)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 10 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Question
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                Let's try asking it a question!
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
                onClick={() => setStep(9)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(11)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 11 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Question
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                Try asking the assistant an onboarding question.
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
              onClick={() => setStep(10)}
              className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 12 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Question
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                Here is the assistant's response.
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
              onClick={() => setStep(11)}
              className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setStep(13)}
              className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 13 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Question
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                Look familiar?
              </p>

              <p className="mt-2 text-xs text-[#222222]">
                The assistant knows what tasks are assigned to you, and will respond accordingly!
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
                onClick={() => setStep(12)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(14)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 14 && (
        <div className="fixed right-8 top-16 z-[70] w-[190px] rounded-lg border border-[#4361AB] bg-white p-4 shadow-lg">
          <div className="flex gap-3">
            <BotMessageSquare className="h-9 w-9 shrink-0 text-[#4361AB]" />

            <div>
              <h3 className="font-bold text-[#222222]">
                Finish
              </h3>

              <p className="mt-1 text-xs text-[#222222]">
                That's all!
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setStep(13)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep(15)}
                className="rounded p-1 text-[#4361AB] hover:bg-[#EEF3FA]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 15 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="w-[280px] rounded-lg border border-[#4361AB] bg-white px-6 py-5 text-center shadow-lg">
            <CircleCheckBig className="mx-auto h-14 w-14 text-[#4361AB]" />

            <h2 className="mt-3 text-xl font-bold text-[#222222]">
              Tour Completed!
            </h2>

            <button
              type="button"
              onClick={() => {
                setStep(0)
                router.push('/dashboard')
              }}
              className="mt-4 rounded-md bg-[#4361AB] px-4 py-2 font-bold text-white hover:bg-[#3B579A]"
            >
              RETURN TO HOME
            </button>
          </div>
        </div>
      )}
    </>
  )
}