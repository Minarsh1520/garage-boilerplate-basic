'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn, formatDatetime } from '@/lib/utils'
import { sendChatMessage } from '@/features/chatbot/actions/chatbot.actions'
import { toHistory } from '@/features/chatbot/lib/history'
import { MAX_QUESTION_LENGTH, type AssistantMessageKind } from '@/features/chatbot/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
  // The three below are only meaningful on assistant messages.
  kind?: AssistantMessageKind
  retryable?: boolean      // error replies: show "Try again"
  suggestions?: string[]   // ready-made questions shown as buttons
}

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

      // Extracted to a local so TS's narrowing survives into the setState callback below —
      // narrowing a property like `result.data` doesn't carry across closure boundaries.
      const reply = result.data

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: reply.text,
          kind: reply.kind,
          retryable: reply.retryable,
          suggestions: reply.suggestions,
          timestamp: new Date(),
        },
      ])
    } catch {
      // The request itself never reached the server or never came back (offline, timeout,
      // deploy in progress). Without this the spinner just stops with no explanation.
      toast.error('Could not reach the assistant. Check your connection and try again.')
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

  // Buttons are only live on the LATEST message, so an old "Try again" can't resend a stale question.
  const lastMessage = messages.at(-1)
  const lastQuestion = messages.filter((m) => m.role === 'user').at(-1)?.text

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => {
          const isEscalation = message.role === 'assistant' && message.kind === 'escalate'
          const isError = message.role === 'assistant' && message.kind === 'error'
          const isLatest = message.id === lastMessage?.id
          return (
            <div
              key={message.id}
              className={cn('flex flex-col', message.role === 'user' ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  // break-words: a long unbroken string (e.g. a link) wraps instead of overflowing the bubble.
                  'max-w-[75%] rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap',
                  message.role === 'user' &&
                    'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
                  message.role === 'assistant' &&
                    !isEscalation &&
                    !isError &&
                    'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
                  isEscalation &&
                    'border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
                  isError &&
                    'border border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
                )}
              >
                {message.text}
              </div>

              {isLatest && isError && message.retryable && lastQuestion && (
                <button
                  type="button"
                  onClick={() => void send(lastQuestion)}
                  disabled={isPending}
                  className="mt-2 rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50 dark:border-zinc-700"
                >
                  Try again
                </button>
              )}

              {isLatest && message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-2 flex max-w-[75%] flex-wrap gap-2">
                  {message.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      disabled={isPending}
                      className="rounded-full border border-zinc-300 px-3 py-1 text-left text-xs disabled:opacity-50 dark:border-zinc-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <span className="mt-1 text-xs text-zinc-400">{formatDatetime(message.timestamp)}</span>
            </div>
          )
        })}

        {isPending && (
          <div className="flex items-start">
            <div className="flex items-center rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder="Ask...."
          aria-label="Message"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={() => void send(input)}
          disabled={isPending || !input.trim()}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}