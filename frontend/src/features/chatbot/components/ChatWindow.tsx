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
    <div className="flex h-full min-h-[calc(100vh-56px)] flex-col bg-white">
      <div
        aria-live="polite"
        className="flex-1 space-y-5 overflow-y-auto px-6 py-5"
      >
        {messages.map((message) => {
          const isEscalation =
            message.role === 'assistant' && message.kind === 'escalation'

          return (
            <div
              key={message.id}
              className={cn(
                'flex flex-col',
                message.role === 'user' ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap',
                  message.role === 'user' &&
                    'bg-zinc-200 text-[#222222]',
                  message.role === 'assistant' &&
                    !isEscalation &&
                    'border border-[#4361AB] bg-[#E8F1F8] text-[#222222]',
                  isEscalation &&
                    'border border-amber-300 bg-amber-50 text-amber-900'
                )}
              >
                {message.text}
              </div>

              <span className="mt-1 text-xs text-zinc-500">
                {formatDatetime(message.timestamp)}
              </span>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 sm:px-6">
        <div className="flex items-center gap-2 rounded-full border border-[#4361AB] bg-[#DDE8F2] p-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              placeholder="Ask...."
              aria-label="Message"
              className="
                w-full bg-transparent
                px-4 py-2 pr-10
                text-sm text-[#222222]
                placeholder:text-[#4361AB]
                outline-none
                disabled:opacity-50
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
            onClick={() => void handleSend()}
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
