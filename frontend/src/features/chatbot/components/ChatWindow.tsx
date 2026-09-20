'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn, formatDatetime } from '@/lib/utils'
import { sendChatMessage } from '@/features/chatbot/actions/chatbot.actions'
import type { AssistantMessageKind, ChatTurn } from '@/features/chatbot/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
  // Only meaningful on assistant messages — see AssistantMessageKind for why.
  kind?: AssistantMessageKind
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

  async function handleSend() {
    const question = input.trim()
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
      // Send the whole thread, not just the latest question — the stub ignores
      // everything but the last turn today, but a real multi-turn backend can
      // use this same call shape without the client needing to change.
      const history: ChatTurn[] = nextMessages.map(({ role, text }) => ({ role, text }))
      const result = await sendChatMessage(history)

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
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsPending(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => {
          const isEscalation = message.role === 'assistant' && message.kind === 'escalation'
          return (
            <div
              key={message.id}
              className={cn('flex flex-col', message.role === 'user' ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                  message.role === 'user' &&
                    'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
                  message.role === 'assistant' &&
                    !isEscalation &&
                    'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
                  isEscalation &&
                    'border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100'
                )}
              >
                {message.text}
              </div>
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
          placeholder="Ask...."
          aria-label="Message"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
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
