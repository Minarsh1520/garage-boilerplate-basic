'use client'

import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn, formatDatetime } from '@/lib/utils'
import { sendChatMessage } from '@/features/chatbot/actions/chatbot.actions'
import type {
  AssistantMessageKind,
  ChatTurn,
} from '@/features/chatbot/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
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
      const history: ChatTurn[] = nextMessages.map(
        ({ role, text }) => ({
          role,
          text,
        })
      )

      const result = await sendChatMessage(history)

      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Failed to get a response')
        return
      }

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

      window.dispatchEvent(new Event('tour-response-ready'))
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
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Messages */}
      <div
        aria-live="polite"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:space-y-5 sm:px-6 sm:py-5"
      >
        {messages.map((message, index) => {
          const isEscalation =
            message.role === 'assistant' &&
            message.kind === 'escalation'

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
                    'border border-[#4361AB] bg-[#E8F1F8] text-[#222222]',
                  isEscalation &&
                    'border border-amber-300 bg-amber-50 text-amber-900'
                )}
              >
                {message.text}
              </div>

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