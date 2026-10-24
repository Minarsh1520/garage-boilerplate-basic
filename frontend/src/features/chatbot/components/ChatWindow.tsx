'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Link from 'next/link'
import { Send, Square } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { cn, formatDatetime } from '@/lib/utils'
import { completeMyTask, requestEscalation, sendChatMessage } from '@/features/chatbot/actions/chatbot.actions'
import {
  approveConversationSummary,
  deleteMyConversation,
  discardConversationSummary,
  getMyConversations,
  openConversation,
  previewConversationSummary,
  renameMyConversation,
} from '@/features/chatbot/actions/conversation.actions'
import { ConversationPicker } from '@/features/chatbot/components/ConversationPicker'
import { CASE_TITLES, PATHWAY_NAMES } from '@/features/chatbot/lib/case-titles'
import {
  MAX_QUESTION_LENGTH,
  type AssistantMessageKind,
  type AssistantReply,
  type ConversationSummary,
  type SavedMessage,
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
  // A stored answer from the Admin FAQ page: show "Get a more detailed answer",
  // which re-asks this question with the stored answer skipped.
  faqQuestion?: string
  // An offer to send the question to the HR team, with the question it refers to.
  // Removed once the employee answers it, so it can't be sent twice.
  offer?: NonNullable<AssistantReply['escalationOffer']> & { question: string }
  // An offer to mark one of the employee's own tasks as completed. Removed once answered.
  taskOffer?: AssistantReply['taskOffer']
  // Links to app pages, chosen by the server from a fixed list.
  links?: AssistantReply['links']
}

// Shared look for the small buttons under a message.
const CHIP_BUTTON = 'rounded-full border border-[#4361AB] px-3 py-1 text-left text-xs text-[#4361AB] disabled:opacity-50'

const GREETING: Message = { id: 'greeting', role: 'assistant', text: 'Hello! How may I assist you today?', timestamp: new Date(0) }
const NEW_TITLE = 'New conversation'
// "Summarise everything so far?" is offered once this many messages have come in since the
// last summary (or since the start). It can also be asked for any time from the bar above.
const OFFER_SUMMARY_AFTER = 8
// After this long, the thinking bubble says so, so a slow answer doesn't look frozen.
const SLOW_AFTER_MS = 8000

// Which conversation is open is remembered for this browser tab, so leaving the Assistant
// page and coming back reopens it. Storage can be unavailable (private windows, blocked
// site data); the chat then simply opens a new conversation.
const CURRENT_KEY = 'assistant.currentConversation'
function rememberCurrent(id: string | null) {
  try {
    if (id) sessionStorage.setItem(CURRENT_KEY, id)
    else sessionStorage.removeItem(CURRENT_KEY)
  } catch {
    // not available: nothing to remember
  }
}
function recallCurrent(): string | null {
  try {
    return sessionStorage.getItem(CURRENT_KEY)
  } catch {
    return null
  }
}

function fromSaved(m: SavedMessage): Message {
  return { id: m.id, role: m.role, text: m.text, kind: m.kind, timestamp: m.createdAt ? new Date(m.createdAt) : new Date() }
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [title, setTitle] = useState(NEW_TITLE)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loadingConversation, setLoadingConversation] = useState(false)

  const [input, setInput] = useState('')
  const [isPending, setIsPending] = useState(false)
  // The case preview: which message's offer is open, and the question as the employee edits it.
  const [casePreview, setCasePreview] = useState<{ messageId: string; question: string } | null>(null)
  // The open conversation's saved summary, and how far into it the summary goes.
  const [messageCount, setMessageCount] = useState(0)
  const [summary, setSummary] = useState<string | null>(null)
  const [summarisedAt, setSummarisedAt] = useState(0)
  // explain: what a summary gives and costs, before anything is generated
  // writing:  the AI is writing it
  // preview:  shown to the employee, saved only if they approve it
  const [summaryStep, setSummaryStep] = useState<'idle' | 'explain' | 'writing' | 'preview'>('idle')
  const [summaryDraft, setSummaryDraft] = useState('')
  const [summaryOfferDismissed, setSummaryOfferDismissed] = useState(false)
  const [isSlow, setIsSlow] = useState(false)
  // Bumped by "Stop": a reply that arrives for an older request number is ignored.
  const requestNumber = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  // "This is taking longer than usual" after SLOW_AFTER_MS of waiting.
  useEffect(() => {
    if (!isPending) return
    const timer = setTimeout(() => setIsSlow(true), SLOW_AFTER_MS)
    return () => {
      clearTimeout(timer)
      setIsSlow(false)
    }
  }, [isPending])

  const refreshList = useCallback(async () => {
    const result = await getMyConversations()
    if (result.success && result.data) setConversations(result.data)
  }, [])

  const showConversation = useCallback(async (id: string) => {
    setLoadingConversation(true)
    try {
      const result = await openConversation(id)
      if (!result.success || !result.data) {
        // Deleted elsewhere, or not this employee's: start fresh instead of showing an error page.
        rememberCurrent(null)
        setConversationId(null)
        setTitle(NEW_TITLE)
        setMessages([GREETING])
        loadSummaryState(null)
        return
      }
      setConversationId(id)
      setTitle(result.data.title)
      setMessages([GREETING, ...result.data.messages.map(fromSaved)])
      loadSummaryState(result.data)
      rememberCurrent(id)
    } finally {
      setLoadingConversation(false)
    }
  }, [])

  // On opening the page: load the list, and reopen the conversation this tab had open.
  // Everything is set after the data arrives (not before), and nothing is set if the
  // employee has already left the page.
  useEffect(() => {
    let left = false
    const remembered = recallCurrent()
    void (async () => {
      const [list, opened] = await Promise.all([getMyConversations(), remembered ? openConversation(remembered) : null])
      if (left) return
      if (list.success && list.data) setConversations(list.data)
      if (remembered && opened?.success && opened.data) {
        setConversationId(remembered)
        setTitle(opened.data.title)
        setMessages([GREETING, ...opened.data.messages.map(fromSaved)])
        setMessageCount(opened.data.messageCount)
        setSummary(opened.data.summary ?? null)
        setSummarisedAt(opened.data.summarisedAtCount ?? 0)
      } else if (remembered) {
        rememberCurrent(null) // deleted since, or not this employee's
      }
    })()
    return () => {
      left = true
    }
  }, [])

  function startNewConversation() {
    rememberCurrent(null)
    setConversationId(null)
    setTitle(NEW_TITLE)
    setMessages([GREETING])
    loadSummaryState(null)
  }

  function loadSummaryState(data: { messageCount: number; summary?: string; summarisedAtCount?: number } | null) {
    setMessageCount(data?.messageCount ?? 0)
    setSummary(data?.summary ?? null)
    setSummarisedAt(data?.summarisedAtCount ?? 0)
    setSummaryStep('idle')
    setSummaryDraft('')
    setSummaryOfferDismissed(false)
  }

  // Only after the employee has read the explanation and pressed "Create a summary".
  async function createSummary() {
    if (!conversationId) return
    setSummaryStep('writing')
    try {
      const result = await previewConversationSummary(conversationId)
      if (result.success && result.data) {
        setSummaryDraft(result.data.summary)
        setSummaryStep('preview')
      } else {
        toast.error(result.error ?? 'A summary could not be written.')
        setSummaryStep('idle')
      }
    } catch {
      toast.error('Could not reach the server. No summary was written.')
      setSummaryStep('idle')
    }
  }

  async function approveSummary() {
    if (!conversationId) return
    const result = await approveConversationSummary(conversationId)
    if (result.success && result.data) {
      setSummary(result.data.summary)
      setSummarisedAt(messageCount)
      toast.success('Summary saved to this conversation.')
    } else {
      toast.error(result.error ?? 'The summary could not be saved.')
    }
    setSummaryStep('idle')
    setSummaryDraft('')
  }

  async function discardSummary() {
    if (conversationId) void discardConversationSummary(conversationId)
    setSummaryStep('idle')
    setSummaryDraft('')
    setSummaryOfferDismissed(true)
  }

  async function handleRename(id: string, newTitle: string): Promise<boolean> {
    const result = await renameMyConversation(id, newTitle)
    if (!result.success) {
      toast.error(result.error ?? 'The name could not be saved.')
      return false
    }
    if (id === conversationId) setTitle(newTitle.trim())
    await refreshList()
    return true
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    const result = await deleteMyConversation(id)
    if (!result.success) return toast.error(result.error ?? 'The conversation could not be deleted.')
    if (id === conversationId) startNewConversation()
    await refreshList()
  }

  // "Stop": the chat is usable again straight away. The server may still finish the answer
  // (and Gemini may still count it); if it does, it is saved and appears in the history.
  function stop() {
    requestNumber.current += 1
    setIsPending(false)
    addAssistantMessage({
      kind: 'fallback',
      text: 'Stopped waiting for that answer. If it finishes, it will be saved in this conversation.',
    })
  }

  function addAssistantMessage(message: Omit<Message, 'id' | 'role' | 'timestamp'>) {
    setMessages((prev) => [...prev, { ...message, id: crypto.randomUUID(), role: 'assistant', timestamp: new Date() }])
  }

  // Takes the question as a parameter (instead of reading the input box) so the
  // "Try again" and suggested-question buttons can send through the same path.
  async function send(rawQuestion: string, options?: { skipFaq?: boolean }) {
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
    const thisRequest = ++requestNumber.current

    try {
      // Only the new question is sent: the server reads the conversation's earlier messages
      // from its own saved copy.
      const result = await sendChatMessage({ question, conversationId: conversationId ?? undefined, skipFaq: options?.skipFaq })

      // Stopped while waiting: ignore the reply, but refresh the list in case it was saved.
      if (thisRequest !== requestNumber.current) {
        void refreshList()
        return
      }

      if (!result.success || !result.data) {
        toast.error(result.error ?? 'Failed to get a response')
        return
      }

      const { reply } = result.data
      if (result.data.conversationId && result.data.conversationId !== conversationId) {
        // The first answer of a new conversation: it now exists, with its title.
        setConversationId(result.data.conversationId)
        rememberCurrent(result.data.conversationId)
      }
      if (result.data.title) setTitle(result.data.title)
      if (result.data.conversationId) setMessageCount((count) => (result.data?.conversationId === conversationId ? count + 2 : 2))
      void refreshList()

      addAssistantMessage({
        text: reply.text,
        kind: reply.kind,
        retryable: reply.retryable,
        suggestions: reply.suggestions,
        faqQuestion: reply.fromFaq ? question : undefined,
        offer: reply.escalationOffer ? { ...reply.escalationOffer, question } : undefined,
        taskOffer: reply.taskOffer,
        links: reply.links,
      })

      // Lets the app tour move on once the first answer is on screen.
      window.dispatchEvent(new Event('tour-response-ready'))
    } catch {
      // The request itself never reached the server or never came back (offline, timeout,
      // deploy in progress). Without this the spinner just stops with no explanation.
      if (thisRequest === requestNumber.current) toast.error('Could not reach the assistant. Check your connection and try again.')
    } finally {
      if (thisRequest === requestNumber.current) setIsPending(false)
    }
  }

  // The offer is taken off the message whichever button is pressed, so it can be answered once only.
  function closeOffer(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, offer: undefined } : m)))
  }

  // "Send to HR team" first shows a PREVIEW of exactly what the HR team will see, which the
  // employee can edit (for example to leave out a detail). Nothing is created until they
  // confirm it. The server re-checks everything on its side when it saves.
  // The description starts as the AI's draft of the request, or the employee's own words
  // when there is no draft (a sensitive-rule match makes no AI call).
  function openCasePreview(message: Message) {
    if (!message.offer || isPending) return
    setCasePreview({ messageId: message.id, question: message.offer.draft ?? message.offer.question })
  }

  // "Mark task completed" (BA: restricted, only through the app's validated process).
  // Confirm is the ONLY thing that changes the checklist; the server checks the task again
  // and what the employee is told comes from the result of that save.
  async function confirmTask(message: Message) {
    if (!message.taskOffer || isPending) return
    const { taskId } = message.taskOffer
    closeTaskOffer(message.id)
    setIsPending(true)
    try {
      const result = await completeMyTask({ taskId })
      if (result.success && result.data) {
        addAssistantMessage({
          kind: 'answer',
          text: `Done: "${result.data.title}" is now marked as completed on your onboarding checklist.`,
          links: [{ label: 'Open my checklist', href: '/dashboard' }],
        })
      } else {
        addAssistantMessage({ kind: 'error', text: result.error ?? 'The task could not be updated. Nothing was changed.' })
      }
    } catch {
      toast.error('Could not reach the server. The task was not changed.')
    } finally {
      setIsPending(false)
    }
  }

  // Cancel changes nothing on the server: the offer is just taken away.
  function cancelTask(message: Message) {
    closeTaskOffer(message.id)
    addAssistantMessage({ kind: 'answer', text: 'Cancelled. Nothing was changed on your checklist.' })
  }

  function closeTaskOffer(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, taskOffer: undefined } : m)))
  }

  // Approving the preview: this is the ONLY thing that creates a case. What the employee is
  // told afterwards comes from the result of the save, so it can't say "sent" when it wasn't.
  async function acceptOffer(message: Message, editedQuestion: string) {
    if (!message.offer || isPending) return
    const { category, pathway } = message.offer
    const question = editedQuestion.trim()
    if (!question) return toast.error('Please keep some text in your question, so the HR team knows what it is about.')

    closeOffer(message.id)
    setCasePreview(null)
    setIsPending(true)

    try {
      const result = await requestEscalation({ question, category, pathway })

      if (result.success && result.data) {
        addAssistantMessage({
          kind: 'escalate',
          text: result.data.alreadySent
            ? `You already sent this request to the HR team today, so it was not sent again. Reference: ${result.data.caseId}`
            : `Your request has been sent to the HR team to review. Reference: ${result.data.caseId}`,
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
      <ConversationPicker
        conversations={conversations}
        currentId={conversationId}
        currentTitle={title}
        disabled={isPending || loadingConversation}
        onSelect={(id) => void showConversation(id)}
        onNew={startNewConversation}
        onRename={handleRename}
        onDelete={(id) => void handleDelete(id)}
        onSummarise={conversationId && messageCount >= 4 && summaryStep === 'idle' ? () => setSummaryStep('explain') : undefined}
      />

      {/* A saved summary sits at the top of the conversation, folded away until opened. */}
      {summary && (
        <details className="mx-3 mt-2 rounded-md border border-[#4361AB] bg-[#E8F1F8] px-3 py-2 text-sm text-[#222222] sm:mx-6">
          <summary className="cursor-pointer font-semibold">Summary of this conversation</summary>
          <p className="mt-1 whitespace-pre-wrap">{summary}</p>
        </details>
      )}

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

              {message.offer && casePreview?.messageId !== message.id && (
                <div className="mt-2 flex max-w-[85%] flex-wrap gap-2 sm:max-w-[75%]">
                  <button type="button" onClick={() => openCasePreview(message)} disabled={isPending} className={CHIP_BUTTON}>
                    Send to HR team
                  </button>
                  <button type="button" onClick={() => closeOffer(message.id)} disabled={isPending} className={CHIP_BUTTON}>
                    No thanks
                  </button>
                </div>
              )}

              {/* The preview (BA: action, data used and destination), editable, sent only on Confirm. */}
              {message.offer && casePreview?.messageId === message.id && (
                <div className="mt-2 w-full max-w-[85%] rounded-md border border-[#4361AB] bg-white p-3 text-sm text-[#222222] sm:max-w-[75%]">
                  <p className="font-semibold">Submit this request?</p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div>
                      <dt className="inline font-semibold">Category: </dt>
                      <dd className="inline">{CASE_TITLES[message.offer.category]}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Recipient: </dt>
                      <dd className="inline">{PATHWAY_NAMES[message.offer.pathway]}</dd>
                    </div>
                  </dl>
                  <label className="mt-2 block text-xs font-semibold">
                    Description, as the HR team will see it (you can edit it)
                    <textarea
                      value={casePreview.question}
                      onChange={(e) => setCasePreview({ messageId: message.id, question: e.target.value })}
                      maxLength={MAX_QUESTION_LENGTH}
                      rows={3}
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm font-normal text-[#222222]"
                    />
                  </label>
                  {message.offer.draft && (
                    <p className="mt-1 text-xs text-gray-600">The Assistant wrote this from your message. Check it says what you mean.</p>
                  )}
                  <p className="mt-1 text-xs text-gray-600">
                    Also included: your name and employee ID from your onboarding record, so the HR team knows who to reply to.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void acceptOffer(message, casePreview.question)}
                      disabled={isPending || !casePreview.question.trim()}
                      className="rounded-full bg-[#4361AB] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button type="button" onClick={() => setCasePreview(null)} disabled={isPending} className={CHIP_BUTTON}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* "Mark task completed" preview: what changes, where, and only on Confirm. */}
              {message.taskOffer && (
                <div className="mt-2 w-full max-w-[85%] rounded-md border border-[#4361AB] bg-white p-3 text-sm text-[#222222] sm:max-w-[75%]">
                  <p className="font-semibold">Mark this task as completed?</p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div>
                      <dt className="inline font-semibold">Task: </dt>
                      <dd className="inline">{message.taskOffer.taskTitle}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold">Change: </dt>
                      <dd className="inline">Pending → Completed, on your onboarding checklist (Home page)</dd>
                    </div>
                  </dl>
                  <p className="mt-1 text-xs text-gray-600">
                    Only confirm if you have finished it. The HR team can see your checklist.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void confirmTask(message)}
                      disabled={isPending}
                      className="rounded-full bg-[#4361AB] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button type="button" onClick={() => cancelTask(message)} disabled={isPending} className={CHIP_BUTTON}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Links to app pages. The addresses come from the server's fixed list. */}
              {message.links && message.links.length > 0 && (
                <div className="mt-2 flex max-w-[85%] flex-wrap gap-2 sm:max-w-[75%]">
                  {message.links.map((link) => (
                    <Link key={link.href} href={link.href} className={CHIP_BUTTON}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}

              {isLatest && message.faqQuestion && (
                <button
                  type="button"
                  onClick={() => void send(message.faqQuestion ?? '', { skipFaq: true })}
                  disabled={isPending}
                  className={cn(CHIP_BUTTON, 'mt-2')}
                >
                  Get a more detailed answer
                </button>
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

              {/* The greeting is shown, not sent, so it has no real time (it was showing 1 Jan 1970). */}
              {message.id !== GREETING.id && (
                <span className="mt-1 text-[10px] text-zinc-500 sm:text-xs">
                  {formatDatetime(message.timestamp)}
                </span>
              )}
            </div>
          )
        })}

        {loadingConversation && (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {/* Thinking indicator: shown while the Assistant is working on an answer. */}
        {isPending && (
          <div className="flex flex-col items-start" role="status">
            <div className="flex max-w-[85%] items-center gap-2 rounded-md border border-[#4361AB] bg-[#E8F1F8] px-3 py-2 text-sm text-[#222222] sm:max-w-[75%]">
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4361AB] [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4361AB] [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4361AB]" />
              </span>
              {isSlow ? 'This is taking longer than usual…' : 'The Assistant is thinking…'}
            </div>
          </div>
        )}

        {/* "Summarise everything so far?" Explained first; nothing is generated until approved. */}
        {conversationId && !isPending && summaryStep === 'idle' && !summaryOfferDismissed && messageCount - summarisedAt >= OFFER_SUMMARY_AFTER && (
          <SummaryCard>
            <p className="font-semibold">Summarise everything so far?</p>
            <p className="mt-1 text-xs">This conversation is getting long. A summary can help.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSummaryStep('explain')} className={CHIP_BUTTON}>
                Tell me more
              </button>
              <button type="button" onClick={() => setSummaryOfferDismissed(true)} className={CHIP_BUTTON}>
                Not now
              </button>
            </div>
          </SummaryCard>
        )}

        {summaryStep === 'explain' && (
          <SummaryCard>
            <p className="font-semibold">Create a summary of this conversation?</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
              <li>
                <strong>What you get:</strong> a short recap of what you asked and the answers you got, kept at the top of this
                chat. The Assistant also uses it to follow a long conversation better.
              </li>
              <li>
                <strong>What it costs:</strong> one extra request from the shared AI allowance, and a summary can leave out
                details. Your full conversation stays saved either way.
              </li>
              <li>You will see the summary first, and it is only saved if you approve it.</li>
            </ul>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void createSummary()}
                className="rounded-full bg-[#4361AB] px-3 py-1 text-xs font-semibold text-white"
              >
                Create a summary
              </button>
              <button
                type="button"
                onClick={() => {
                  setSummaryStep('idle')
                  setSummaryOfferDismissed(true)
                }}
                className={CHIP_BUTTON}
              >
                Not now
              </button>
            </div>
          </SummaryCard>
        )}

        {summaryStep === 'writing' && (
          <SummaryCard>
            <p role="status">Writing a summary…</p>
          </SummaryCard>
        )}

        {summaryStep === 'preview' && (
          <SummaryCard>
            <p className="font-semibold">Summary preview</p>
            <p className="mt-1 whitespace-pre-wrap">{summaryDraft}</p>
            <p className="mt-2 text-xs text-gray-600">Save it to this conversation?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void approveSummary()}
                className="rounded-full bg-[#4361AB] px-3 py-1 text-xs font-semibold text-white"
              >
                Save summary
              </button>
              <button type="button" onClick={() => void discardSummary()} className={CHIP_BUTTON}>
                Discard
              </button>
            </div>
          </SummaryCard>
        )}

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

          </div>

          {/* While an answer is on its way, the Send button becomes Stop. */}
          {isPending ? (
            <button
              type="button"
              data-tour="stop-query"
              onClick={stop}
              aria-label="Stop waiting for the answer"
              title="Stop"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4361AB] text-white"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={!input.trim() || loadingConversation}
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
          )}
        </div>
      </div>
    </div>
  )
}

// The look shared by the summary offer, explanation and preview.
function SummaryCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start">
      <div className="w-full max-w-[85%] rounded-md border border-[#4361AB] bg-white p-3 text-sm text-[#222222] sm:max-w-[75%]">
        {children}
      </div>
    </div>
  )
}

