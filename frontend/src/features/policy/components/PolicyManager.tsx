'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import { getPolicyForm, previewPolicyFile, publishPolicyForm, removePolicy } from '@/actions/policy.actions'
import { POLICY_FILE_EXTENSIONS, POLICY_LAYOUT_RULES, type PolicyForm } from '@/lib/rag/policy-sources'
import type { PolicyListItem } from '@/lib/rag/publish'
import { PolicyFormEditor } from './PolicyFormEditor'

// Nihal's drop zone and styling. An uploaded file must follow the policy layout (listed on
// the page); the server reads it into a form the admin checks before anything reaches the chatbot.
const MAX_FILE_SIZE = 500 * 1024
const BUTTON = 'rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50'

const STATUS_STYLE: Record<PolicyListItem['status'], { label: string; className: string }> = {
  ready: { label: 'In use by the assistant', className: 'text-green-700' },
  processing: { label: 'Publishing...', className: 'text-amber-700' },
  failed: { label: 'Failed, please publish again', className: 'text-red-600' },
  'not-published': { label: 'Uploaded only, not in use', className: 'text-gray-500' },
}

// policyId and version are set when editing a published policy, so it is updated in place
// and a newer version someone else published in the meantime is noticed.
type Draft = { form: PolicyForm; source: 'file' | 'form'; fileName?: string; policyId?: string; version?: number }

export function PolicyManager({ policies }: { policies: PolicyListItem[] }) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'reading' | 'publishing' | 'removing' | null>(null)
  const [readingName, setReadingName] = useState<string | null>(null) // BA: the selected file name is visible

  async function handleFile(file: File) {
    setError(null)
    // A quick check here for a fast message; the server checks the file's contents too.
    const name = file.name.toLowerCase()
    if (!POLICY_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      return setError(`Only Word (.docx), PDF, text (.txt), Markdown (.md) and web page (.html) files are supported.${name.endsWith('.doc') ? ' Save older .doc files as .docx first.' : ''}`)
    }
    if (file.size > MAX_FILE_SIZE) return setError('The file must be 500 KB or smaller.')

    setBusy('reading')
    setReadingName(file.name)
    try {
      const result = await previewPolicyFile(file.name, await readFileAsDataUrl(file))
      if (result.success && result.data) setDraft({ form: result.data, source: 'file', fileName: file.name })
      else setError(result.error ?? 'This file could not be read.')
    } catch {
      setError('Could not reach the server. Please try again.')
    } finally {
      setBusy(null)
      setReadingName(null)
    }
  }

  async function handlePublish(form: PolicyForm, replace = false) {
    if (!draft) return
    setBusy('publishing')
    try {
      const result = await publishPolicyForm({
        form,
        source: draft.source,
        fileName: draft.fileName,
        editingPolicyId: draft.policyId,
        expectedVersion: draft.version,
        replace,
      })
      if (result.success && result.data?.outcome === 'exists') {
        // A policy with this title is already published: replacing it is the admin's call.
        const { existingTitle, existingUpdatedAt } = result.data
        const when = existingUpdatedAt ? ` (last published ${new Date(existingUpdatedAt).toLocaleDateString()})` : ''
        setBusy(null)
        if (window.confirm(`A policy called "${existingTitle}" already exists${when}. Replace it with this one?`)) {
          await handlePublish(form, true)
        }
        return
      }
      if (result.success && result.data?.outcome === 'conflict') {
        toast.error('Someone else published a newer version of this policy since you opened it. Close this form, open the policy again, then make your changes.')
        return
      }
      if (result.success) {
        toast.success(`Published: the assistant can now answer from "${form.title}".`)
        setDraft(null)
        router.refresh()
      } else {
        toast.error(result.error ?? 'The policy could not be published.')
        router.refresh() // shows the "failed" row
      }
    } catch {
      toast.error('Could not reach the server. The policy was not published.')
    } finally {
      setBusy(null)
    }
  }

  async function handleEdit(policyId: string) {
    const result = await getPolicyForm(policyId)
    if (result.success && result.data) setDraft({ form: result.data.form, source: 'form', policyId, version: result.data.version })
    else toast.error(result.error ?? 'This policy could not be opened.')
  }

  async function handleRemove(policy: PolicyListItem) {
    if (!window.confirm(`Remove "${policy.title}"? The assistant will stop using it straight away.`)) return
    setBusy('removing')
    try {
      const result = await removePolicy(policy.policyId)
      if (result.success) {
        toast.success('Policy removed')
        router.refresh()
      } else toast.error(result.error ?? 'The policy could not be removed.')
    } finally {
      setBusy(null)
    }
  }

  // While a draft is open, the page shows only the form, so it is clear nothing is live yet.
  if (draft) {
    return (
      <PolicyFormEditor
        initial={draft.form}
        fromFile={draft.source === 'file'}
        editingId={draft.policyId}
        fileName={draft.fileName}
        publishing={busy === 'publishing'}
        onPublish={(form) => void handlePublish(form)}
        onCancel={() => setDraft(null)}
      />
    )
  }

  return (
    // text-[#222222]: keeps the text dark on this white page when the computer is in dark mode.
    <div className="mt-6 flex flex-col gap-6 text-[#222222] lg:flex-row">
      <div className="w-full max-w-md space-y-4">
        {/* Route 1: upload a PDF */}
        <div
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files?.[0]
            if (file) void handleFile(file)
          }}
          onDragOver={(event) => event.preventDefault()}
          className="flex min-h-52 w-full flex-col items-center justify-center bg-gray-100 p-6 text-center"
        >
          <FileUp className="h-14 w-14 text-[#4361AB]" />
          <p className="mt-3 font-semibold text-[#222222]">{busy === 'reading' ? `Reading ${readingName ?? 'the file'}...` : 'Drag files here'}</p>
          <p className="text-sm text-gray-500">or</p>
          <label className="mt-3 cursor-pointer rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A]">
            Browse Files
            <input
              type="file"
              accept={POLICY_FILE_EXTENSIONS.join(',')}
              disabled={busy !== null}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = '' // lets the same file be picked again
                if (file) void handleFile(file)
              }}
              className="hidden"
            />
          </label>
          <p className="mt-2 text-xs text-gray-500">Word (.docx), PDF, text (.txt), Markdown (.md) or web page (.html), maximum 500 KB. You can check the text before it is published.</p>
        </div>

        {/* Route 2: type it in */}
        <button
          type="button"
          onClick={() => setDraft({ form: { title: '', sections: [{ heading: '', body: '' }] }, source: 'form' })}
          disabled={busy !== null}
          className={`${BUTTON} flex items-center gap-2`}
        >
          <PenLine className="h-4 w-4" /> Write a policy
        </button>

        {/* The one layout every uploaded file must follow, whatever its type. */}
        <div className="rounded border border-gray-300 px-4 py-3 text-xs text-[#222222]">
          <p className="font-semibold">Policy file layout</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {POLICY_LAYOUT_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>

        {error && (
          // whitespace-pre-line: a layout error lists one problem per line.
          <p className="whitespace-pre-line text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* What the assistant currently knows */}
      <div className="w-full">
        <h2 className="text-sm font-bold text-[#222222]">Policies ({policies.length})</h2>
        {policies.length === 0 ? (
          <p className="mt-3 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-500">No policies yet</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {policies.map((policy) => (
              <li key={policy.policyId} className="flex items-start justify-between gap-4 rounded-lg border border-gray-300 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#222222]">{policy.title}</p>
                  <p className={`text-xs ${STATUS_STYLE[policy.status].className}`}>
                    {STATUS_STYLE[policy.status].label}
                    {policy.chunkCount ? ` · ${policy.chunkCount} sections` : ''}
                    {policy.updatedAt ? ` · ${new Date(policy.updatedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  {policy.status !== 'not-published' && (
                    <button type="button" onClick={() => void handleEdit(policy.policyId)} disabled={busy !== null} className="text-xs font-semibold text-[#4361AB] hover:underline">
                      Edit
                    </button>
                  )}
                  <button type="button" onClick={() => void handleRemove(policy)} disabled={busy !== null} className="text-xs font-semibold text-red-600 hover:underline">
                    Remove
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to read file')))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
