'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ListChecks, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ConversationSummary } from '@/features/chatbot/types'

// The "Conversations" dropdown above the chat: switch between saved conversations, start a
// new one, rename or delete. A dropdown rather than a second sidebar, because the app's own
// sidebar is already on the left and a second list would crowd laptops and phones.
export function ConversationPicker(props: {
  conversations: ConversationSummary[]
  currentId: string | null
  currentTitle: string
  disabled: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (id: string, title: string) => Promise<boolean>
  onDelete: (id: string) => void
  onSummarise?: () => void // shown only when the open conversation can be summarised
}) {
  const [open, setOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on a click outside the panel or on Escape, like any dropdown.
  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function saveRename(id: string) {
    if (await props.onRename(id, draftTitle)) setRenamingId(null)
  }

  return (
    <div ref={panelRef} className="relative flex items-center gap-2 border-b border-[#4361AB] px-3 py-2 sm:px-6">
      <button
        type="button"
        data-tour="conversation-history"
        onClick={() => setOpen((v) => !v)}
        disabled={props.disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex min-w-0 flex-1 items-center gap-1 text-left text-sm font-semibold text-[#222222] disabled:opacity-50"
      >
        <span className="truncate">{props.currentTitle}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#4361AB]" />
      </button>
      {props.onSummarise && (
        <button
          type="button"
          onClick={props.onSummarise}
          disabled={props.disabled}
          className="flex shrink-0 items-center gap-1 rounded-full border border-[#4361AB] px-3 py-1 text-xs font-semibold text-[#4361AB] disabled:opacity-50"
        >
          <ListChecks className="h-3.5 w-3.5" /> Summarise
        </button>
      )}
      <button
        type="button"
        data-tour="new-chat"
        onClick={() => {
          setOpen(false)
          props.onNew()
        }}
        disabled={props.disabled}
        className="flex shrink-0 items-center gap-1 rounded-full border border-[#4361AB] px-3 py-1 text-xs font-semibold text-[#4361AB] disabled:opacity-50"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" /> New chat
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Your conversations"
          className="absolute left-3 right-3 top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-md border border-gray-300 bg-white shadow-lg sm:left-6 sm:right-auto sm:w-96"
        >
          {props.conversations.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-600">No saved conversations yet.</p>
          ) : (
            props.conversations.map((c) => (
              <div
                key={c.id}
                role="option"
                aria-selected={c.id === props.currentId}
                className={cn('border-b border-gray-100 px-4 py-2 text-[#222222]', c.id === props.currentId && 'bg-[#E8F1F8]')}
              >
                {renamingId === c.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void saveRename(c.id)
                      }}
                      maxLength={80}
                      aria-label="Conversation name"
                      autoFocus
                      className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-[#222222]"
                    />
                    <button type="button" aria-label="Save name" onClick={() => void saveRename(c.id)}>
                      <Check className="h-4 w-4 text-green-700" />
                    </button>
                    <button type="button" aria-label="Cancel rename" onClick={() => setRenamingId(null)}>
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        props.onSelect(c.id)
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-semibold">{c.title}</span>
                      {c.description && <span className="block truncate text-xs text-gray-600">{c.description}</span>}
                      {c.updatedAt && <span className="block text-[10px] text-gray-500">{new Date(c.updatedAt).toLocaleString()}</span>}
                    </button>
                    <button
                      type="button"
                      aria-label={`Rename ${c.title}`}
                      onClick={() => {
                        setRenamingId(c.id)
                        setDraftTitle(c.title)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-[#4361AB]" />
                    </button>
                    <button type="button" aria-label={`Delete ${c.title}`} onClick={() => props.onDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
