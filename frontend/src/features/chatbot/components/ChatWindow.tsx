'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn, formatDatetime } from '@/lib/utils'
import { requestEscalation, sendChatMessage } from '@/features/chatbot/actions/chatbot.actions'
import { toHistory } from '@/features/chatbot/lib/history'
import {
  MAX_QUESTION_LENGTH,
  type AssistantMessageKind,
  type AssistantReply,
} from '@/features/chatbot/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
  // Everything below is only meaningful on assistant messages.
  kind?: AssistantMessageKind
  retryable?: boolean      // error replies: show "Try again"
  suggestions?: string[]   // ready-made questions shown as buttons
  // An offer to send the question to the HR team, with the question it refers to.
  // Removed once the employee answers it, so it can't be sent twice.
  offer?: NonNullable<AssistantReply['escalationOffer']> & { question: string }
}

// Shared look for the small buttons under a message.
const CHIP_BUTTON = 'rounded-full border border-[#4361AB] px-3 py-1 text-left text-xs text-[#4361AB] disabled:opacity-50'

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'greeting',
      role: 'assistant',
      text: 'Hello! How may I assist you today?',
      timestamp: new Date(),
    },
  ])

  const [input, setInput] = useState('')
  const [isPending, setIsPending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  function addAssistantMessage(message: Omit<Message, 'id' | 'role' | 'timestamp'>) {
    setMessages((prev) => [...prev, { ...message, id: crypto.randomUUID(), role: 'assistant', timestamp: new Date() }])
  }

  // Takes the question as a parameter (instead of reading the input box) so the
  // "Try again" and suggested-question buttons can send through the same path.
  async function send(rawQuestion: string) {
    const question = rawQuestion.trim()

    if (!question || isPending) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: question,
      timestamp: new Date(),
    }

    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setIsPending(true)

    try {
      // toHistory drops error bubbles and keeps only the recent turns the server needs.
      const result = await sendChatMessage(toHistory(nextMessages))

      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Failed to get a response')
        return
      }

      const reply = result.data

      addAssistantMessage({
        text: reply.text,
        kind: reply.kind,
        retryable: reply.retryable,
        suggestions: reply.suggestions,
        offer: reply.escalationOffer ? { ...reply.escalationOffer, question } : undefined,
      })

      // Lets the app tour move on once the first answer is on screen.
      window.dispatchEvent(new Event('tour-response-ready'))
    } catch {
      // The request itself never reached the server or never came back (offline, timeout,
      // deploy in progress). Without this the spinner just stops with no explanation.
      toast.error('Could not reach the assistant. Check your connection and try again.')
    } finally {
      setIsPending(false)
    }
  }

  // The offer is taken off the message whichever button is pressed, so it can be answered once only.
  function closeOffer(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, offer: undefined } : m)))
  }

  // "Send to HR team": this is the ONLY thing that creates a case. What the employee is told
  // afterwards comes from the result of the save, so it can't say "sent" when it wasn't.
  async function acceptOffer(message: Message) {
    if (!message.offer || isPending) return
    const { question, category, pathway } = message.offer

    closeOffer(message.id)
    setIsPending(true)

    try {
      const result = await requestEscalation({ question, category, pathway })

      if (result.success && result.data) {
        addAssistantMessage({
          kind: 'escalate',
          text: `Your question has been sent to the HR team to review. Reference: ${result.data.caseId}`,
        })
      } else {
        addAssistantMessage({
          kind: 'error',
          text: result.error ?? 'Your question could not be sent to the HR team. Please contact HR directly.',
        })
      }
    } catch {
      toast.error('Could not reach the server. Your question was not sent.')
    } finally {
      setIsPending(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void send(input)
    }
  }

  // "Try again" and suggested questions are only live on the LATEST message, so an old
  // button can't resend a stale question.
  const lastMessage = messages.at(-1)
  const lastQuestion = messages.filter((m) => m.role === 'user').at(-1)?.text

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Messages */}
      <div
        aria-live="polite"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:space-y-5 sm:px-6 sm:py-5"
      >
        {messages.map((message, index) => {
          const isEscalation = message.role === 'assistant' && message.kind === 'escalate'
          const isError = message.role === 'assistant' && message.kind === 'error'
          const isLatest = message.id === lastMessage?.id

          const isLatestAssistant =
            message.role === 'assistant' &&
            message.id !== 'greeting' &&
            index === messages.length - 1

          return (
            <div
              key={message.id}
              className={cn(
                'flex flex-col',
                message.role === 'user'
                  ? 'items-end'
                  : 'items-start'
              )}
            >
              <div
                data-tour={
                  isLatestAssistant
                    ? 'assistant-response'
                    : undefined
                }
                className={cn(
                  'max-w-[85%] break-words rounded-md px-3 py-2 text-sm whitespace-pre-wrap sm:max-w-[75%]',
                  message.role === 'user' &&
                    'bg-zinc-200 text-[#222222]',
                  message.role === 'assistant' &&
                    !isEscalation &&
                    !isError &&
                    'border border-[#4361AB] bg-[#E8F1F8] text-[#222222]',
                  isEscalation &&
                    'border border-amber-300 bg-amber-50 text-amber-900',
                  isError &&
                    'border border-red-300 bg-red-50 text-red-900'
                )}
              >
                {message.text}
              </div>

              {message.offer && (
                <div className="mt-2 flex max-w-[85%] flex-wrap gap-2 sm:max-w-[75%]">
                  <button type="button" onClick={() => void acceptOffer(message)} disabled={isPending} className={CHIP_BUTTON}>
                    Send to HR team
                  </button>
                  <button type="button" onClick={() => closeOffer(message.id)} disabled={isPending} className={CHIP_BUTTON}>
                    No thanks
                  </button>
                </div>
              )}

              {isLatest && isError && message.retryable && lastQuestion && (
                <button type="button" onClick={() => void send(lastQuestion)} disabled={isPending} className={cn(CHIP_BUTTON, 'mt-2')}>
                  Try again
                </button>
              )}

              {isLatest && message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-2 flex max-w-[85%] flex-wrap gap-2 sm:max-w-[75%]">
                  {message.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      disabled={isPending}
                      className={CHIP_BUTTON}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <span className="mt-1 text-[10px] text-zinc-500 sm:text-xs">
                {formatDatetime(message.timestamp)}
              </span>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-3 pb-3 sm:px-6 sm:pb-4">
        <div
          data-tour="chat-input"
          className="relative flex items-center gap-2 rounded-full border border-[#4361AB] bg-[#DDE8F2] p-1"
        >
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={isPending}
              // Same limit the server enforces, so an over-long question can't be typed at all.
              maxLength={MAX_QUESTION_LENGTH}
              placeholder="Ask...."
              aria-label="Message"
              className="
                w-full bg-transparent
                px-3 py-2 pr-10
                text-sm text-[#222222]
                placeholder:text-[#4361AB]
                outline-none
                disabled:opacity-50
                sm:px-4
              "
            />

            {isPending && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void send(input)}
            disabled={isPending || !input.trim()}
            aria-label="Send message"
            className="
              flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-full
              bg-[#4361AB]
              text-white
              disabled:opacity-50
            "
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
