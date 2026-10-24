'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteFaqAnswer, saveFaqAnswer, toggleFaqAnswer } from '@/actions/faq.actions'
import type { FaqListItem } from '@/lib/rag/faq'

const EMPTY = { question: '', answer: '', policyTitle: '' }
const BUTTON = 'rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50'
const LINK_BUTTON = 'text-xs font-semibold text-[#4361AB] hover:underline disabled:opacity-50'

export function FaqManager({ faqs }: { faqs: FaqListItem[] }) {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Every change goes through a server action, then the page re-reads the list.
  async function run(action: () => Promise<{ success: boolean; error?: string }>, done: string) {
    setBusy(true)
    try {
      const result = await action()
      if (!result.success) {
        toast.error(result.error ?? 'Something went wrong.')
        return false
      }
      toast.success(done)
      router.refresh()
      return true
    } catch {
      toast.error('Could not reach the server. Nothing was changed.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    const ok = await run(() => saveFaqAnswer(form, editingId ?? undefined), editingId ? 'Answer updated' : 'Answer added')
    if (ok) {
      setForm(EMPTY)
      setEditingId(null)
    }
  }

  function startEdit(faq: FaqListItem) {
    setEditingId(faq.id)
    setForm({ question: faq.question, answer: faq.answer, policyTitle: faq.policyTitle ?? '' })
  }

  return (
    // text-[#222222] here (and on the inputs): globals.css turns page text near-white when the
    // computer is in dark mode, but this page stays white, so labels and typing faded out.
    <div className="mt-6 flex flex-col gap-8 text-[#222222] lg:flex-row">
      {/* Add / edit form */}
      <div className="w-full max-w-md space-y-3">
        <h2 className="text-sm font-bold text-[#222222]">{editingId ? 'Edit answer' : 'Add an answer'}</h2>
        <label className="block text-sm font-semibold text-[#222222]">
          Question
          <input
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            maxLength={300}
            placeholder="How do I request leave?"
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal text-[#222222] placeholder:text-gray-400"
          />
        </label>
        <label className="block text-sm font-semibold text-[#222222]">
          Answer
          <textarea
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            maxLength={2000}
            rows={6}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal text-[#222222] placeholder:text-gray-400"
          />
        </label>
        <label className="block text-sm font-semibold text-[#222222]">
          Policy it comes from (optional)
          <input
            value={form.policyTitle}
            onChange={(e) => setForm({ ...form, policyTitle: e.target.value })}
            maxLength={120}
            placeholder="Leave Policy"
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal text-[#222222] placeholder:text-gray-400"
          />
        </label>
        <div className="flex gap-3">
          <button type="button" onClick={() => void handleSave()} disabled={busy} className={BUTTON}>
            {busy ? 'Saving...' : editingId ? 'Save changes' : 'Add answer'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY) }} disabled={busy} className={LINK_BUTTON}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* The list */}
      <div className="w-full">
        <h2 className="text-sm font-bold text-[#222222]">Stored answers ({faqs.length})</h2>
        {faqs.length === 0 ? (
          <p className="mt-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">No stored answers yet.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {faqs.map((faq) => (
              <li key={faq.id} className={`border-b border-gray-300 pb-4 ${faq.active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-4">
                  <p className="font-semibold text-[#222222]">{faq.question}</p>
                  <span className={`text-xs font-semibold uppercase ${faq.active ? 'text-green-700' : 'text-gray-500'}`}>
                    {faq.active ? 'In use' : 'Switched off'}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[#222222]">{faq.answer}</p>
                {faq.policyTitle && <p className="mt-1 text-xs text-gray-500">Source: {faq.policyTitle}</p>}
                <div className="mt-2 flex gap-4">
                  <button type="button" onClick={() => startEdit(faq)} disabled={busy} className={LINK_BUTTON}>Edit</button>
                  <button
                    type="button"
                    onClick={() => void run(() => toggleFaqAnswer(faq.id, !faq.active), faq.active ? 'Switched off' : 'Switched on')}
                    disabled={busy}
                    className={LINK_BUTTON}
                  >
                    {faq.active ? 'Switch off' : 'Switch on'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (window.confirm('Delete this answer?')) void run(() => deleteFaqAnswer(faq.id), 'Answer deleted') }}
                    disabled={busy}
                    className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
