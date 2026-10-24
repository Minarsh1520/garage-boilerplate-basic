'use client'

import { useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import {
  formToLayoutText,
  numberedBodyLines,
  parsePolicyText,
  policyFormSchema,
  slugify,
  stripHeadingNumber,
  type PolicyForm,
} from '@/lib/rag/policy-sources'

// Colours are set on every label and input on purpose. globals.css switches the page text
// to near-white when the computer is in dark mode, while these pages stay on a white
// background, which made the labels and typed text almost invisible.
const LABEL = 'block text-sm font-semibold text-[#222222]'
const HELP = 'mt-0.5 text-xs font-normal text-gray-600'
const INPUT =
  'mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-[#222222] placeholder:text-gray-400 focus:border-[#4361AB] focus:outline-none'
const BUTTON =
  'rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50'

// The form follows the SAME layout every uploaded file must follow (POLICY_LAYOUT_RULES):
// a title, an optional introduction, then numbered sections (lists inside use bullet points,
// or two or more numbered items).
// The numbers are added by the form, so the admin only types the words.
export function PolicyFormEditor(props: {
  initial: PolicyForm
  fromFile: boolean
  fileName?: string // the uploaded file, shown so the admin can see which file this is
  editingId?: string // set when editing: the policy keeps this id whatever the title
  publishing: boolean
  onPublish: (form: PolicyForm) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(props.initial.title)
  const [intro, setIntro] = useState(props.initial.intro ?? '')
  const [sections, setSections] = useState(props.initial.sections)
  const [problems, setProblems] = useState<string[]>([])

  const updateSection = (index: number, change: Partial<PolicyForm['sections'][number]>) =>
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...change } : s)))

  // Checked in the same order the admin reads the page, and every problem is listed at
  // once, so they don't have to press Publish again and again to find the next one.
  function submit() {
    const found: string[] = []
    if (title.trim().length < 3) found.push('Give the policy a title (at least 3 characters).')
    const cleaned = sections.map((s) => ({ heading: stripHeadingNumber(s.heading).trim(), body: s.body.trim() }))
    cleaned.forEach((s, i) => {
      if (!s.heading) found.push(`Section ${i + 1} needs a heading.`)
      if (!s.body) found.push(`Section ${i + 1} needs some text.`)
    })
    // The typed policy must read back the same through the SAME layout reader used for
    // uploads, so a typed policy and an uploaded one can never be read differently.
    if (found.length === 0) {
      const readBack = parsePolicyText(formToLayoutText({ title, intro, sections: cleaned }), { wrappedLines: false })
      if (!readBack.ok) found.push(...readBack.problems)
      else {
        const moved = cleaned.findIndex((s, i) => readBack.form.sections[i]?.heading !== s.heading)
        if (moved >= 0 || readBack.form.sections.length !== cleaned.length) {
          const at = Math.max(moved, 0)
          found.push(
            `Section ${at + 1}: a numbered line in the text would be read as a new section heading. End numbered list items with a full stop, use two or more numbered items, or start the line with "- ".`
          )
        }
      }
    }
    if (found.length === 0) {
      const parsed = policyFormSchema.safeParse({ title, intro, sections: cleaned })
      if (parsed.success) {
        setProblems([])
        return props.onPublish(parsed.data)
      }
      found.push(parsed.error.issues[0]?.message ?? 'Please check the form.')
    }
    setProblems(found)
  }

  // Lets the admin keep a copy in the official layout; it uploads back as the same policy.
  function downloadAsFile() {
    const text = formToLayoutText({ title: title || 'Untitled policy', intro, sections })
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${slugify(title) || 'policy'}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mt-6 max-w-3xl space-y-5 text-[#222222]">
      {props.fromFile ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {props.fileName && <strong className="block">{props.fileName}</strong>}
          This is how the file was read, using its numbered headings. Please check the headings and text before
          publishing: the assistant will answer from exactly what is here.
        </p>
      ) : (
        <div className="rounded border border-[#4361AB] bg-[#E8F1F8] px-4 py-3 text-sm text-[#222222]">
          <p className="font-semibold">How to write a policy</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Give it the title employees will see as the source of an answer.</li>
            <li>Optionally, say in a sentence or two what it covers and who it applies to.</li>
            <li>Add one section per topic, with a short heading. Sections are numbered for you.</li>
            <li>Write full sentences. For a list, start each line with &quot;- &quot;, or number two or more items ending with a full stop.</li>
          </ol>
          <p className="mt-2 text-xs text-gray-600">
            The assistant answers only from what is written here, so include who to contact and any deadlines.
          </p>
        </div>
      )}

      <label className={LABEL}>
        Policy title
        <span className={`block ${HELP}`}>Shown to employees under each answer that uses this policy.</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="e.g. Leave Policy"
          className={INPUT}
        />
      </label>
      {/* The id decides what is replaced: same title = new version of the same policy. */}
      {props.editingId ? (
        <p className="-mt-3 text-xs text-gray-600">Editing “{props.editingId}”. Publishing replaces the current version.</p>
      ) : (
        slugify(title) && (
          <p className="-mt-3 text-xs text-gray-600">
            Saved as “{slugify(title)}”. Publishing with an existing title replaces that policy.
          </p>
        )
      )}

      <label className={LABEL}>
        Introduction <span className="font-normal text-gray-600">(optional)</span>
        <span className={`block ${HELP}`}>What the policy covers and who it applies to.</span>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="e.g. This policy explains how employees request and take leave."
          className={INPUT}
        />
      </label>

      {sections.map((section, index) => {
        const numbered = numberedBodyLines(section.body)
        return (
          <div key={index} className="rounded-lg border border-gray-300 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#4361AB]">Section {index + 1}</span>
              {sections.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove section ${index + 1}`}
                  onClick={() => setSections((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              )}
            </div>

            <label className={`mt-2 ${LABEL}`}>
              Heading
              <span className={`block ${HELP}`}>A short name for this topic. The number is added for you.</span>
              {/* The number is shown in front of the box, exactly as it will appear in the policy. */}
              <span className="mt-1 flex items-center gap-2">
                <span className="w-8 shrink-0 text-right font-semibold text-[#4361AB]">{index + 1}.</span>
                <input
                  value={section.heading}
                  onChange={(e) => updateSection(index, { heading: e.target.value })}
                  onBlur={(e) => updateSection(index, { heading: stripHeadingNumber(e.target.value) })}
                  maxLength={120}
                  placeholder="e.g. Requesting leave"
                  className={`${INPUT} mt-0`}
                />
              </span>
            </label>

            <label className={`mt-3 ${LABEL}`}>
              Text
              <span className={`block ${HELP}`}>Full sentences. For a list, start each line with &quot;- &quot;, or number two or more items (1. 2. 3.).</span>
              <textarea
                value={section.body}
                onChange={(e) => updateSection(index, { body: e.target.value })}
                rows={6}
                maxLength={8000}
                placeholder={'e.g. Submit leave requests in the Employee Portal under My Leave.\n- Planned leave: at least two weeks ahead\n- Unplanned leave: tell your manager on the day'}
                className={INPUT}
              />
            </label>
            <div className="mt-1 flex justify-between text-xs">
              {/* Same rule as file uploads, shown as they type rather than after Publish. */}
              <span className="text-amber-700">
                {numbered.length === 1 ? 'A single numbered line can be read as a section heading: use "- ", or two or more numbered items.' : ''}
              </span>
              <span className="text-gray-600">{section.body.length.toLocaleString()} / 8,000</span>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={() => setSections((prev) => [...prev, { heading: '', body: '' }])}
        disabled={sections.length >= 50}
        className="flex items-center gap-1 text-sm font-semibold text-[#4361AB] disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Add section {sections.length + 1}
      </button>

      {/* What the policy will look like in the official file layout. */}
      <details className="rounded border border-gray-300 bg-white px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold text-[#222222]">Preview in the policy file layout</summary>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-sans text-sm text-[#222222]">
          {formToLayoutText({ title: title || '(title)', intro, sections: sections.map((s) => ({ heading: stripHeadingNumber(s.heading) || '(heading)', body: s.body })) })}
        </pre>
        <button type="button" onClick={downloadAsFile} className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#4361AB]">
          <Download className="h-3.5 w-3.5" /> Download as a .txt file
        </button>
      </details>

      {problems.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <p className="font-semibold">Please fix these before publishing:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={submit} disabled={props.publishing} className={BUTTON}>
          {props.publishing ? 'Publishing...' : 'Publish to assistant'}
        </button>
        <button type="button" onClick={props.onCancel} disabled={props.publishing} className="text-sm font-semibold text-[#4361AB]">
          Cancel
        </button>
      </div>
    </div>
  )
}
