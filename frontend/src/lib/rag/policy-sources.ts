import { z } from 'zod'

// Both ways of adding a policy on the Admin page end in the SAME form: a title, an
// optional introduction and a list of sections. A PDF is turned into this form for the
// admin to check and correct; "Write a policy" starts from an empty one. Only the form
// is ever published, so the chatbot never sees raw, unchecked PDF text.
export const policySectionSchema = z.object({
    heading: z.string().trim().min(1, 'Every section needs a heading.').max(120),
    body: z.string().trim().min(1, 'Every section needs some text.').max(8000),
})
export const policyFormSchema = z.object({
    title: z
        .string()
        .trim()
        .min(3, 'Please give the policy a title.')
        .max(120)
        // Any language counts ("Chính sách nghỉ phép", "請假政策"); only symbols and emoji don't.
        .refine((t) => /[\p{L}\p{N}]/u.test(t), 'The title needs at least one letter or number.'),
    intro: z.string().trim().max(4000).optional().transform((v) => v || undefined),
    sections: z.array(policySectionSchema).min(1, 'Add at least one section.').max(50),
})
export type PolicyForm = z.infer<typeof policyFormSchema>
export type PolicySection = z.infer<typeof policySectionSchema>

// The policy's id comes from its title, so "Leave Policy" is always `leave-policy`, the
// same id the seed script uses for seed/policies/leave-policy.md. Publishing a policy
// with the same title again REPLACES its old version instead of adding a second copy.
export function slugify(title: string): string {
    const slug = title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/, '')
    // A title with no English letters or digits (e.g. one written only in Chinese) gives an
    // empty slug. It then gets "policy-" plus a short code worked out from the title, so the
    // same title always gives the same id and publishing it again still replaces it.
    return slug || (title.trim() ? `policy-${shortHash(title.trim())}` : '')
}

// A short, stable code for a piece of text (FNV-1a, 32-bit). Not for security: only for ids.
function shortHash(text: string): string {
    let hash = 0x811c9dc5
    for (const char of text) {
        hash ^= char.codePointAt(0) ?? 0
        hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return hash.toString(36)
}

// A body line starting with "#" would be read by the chunker as a new heading and
// split the section in the wrong place, so leading #s are removed from body text.
const noHeadings = (text: string) => text.replace(/^[ \t]*#+[ \t]*/gm, '')

// The form → the Markdown that ingestPolicy() and the chunker already understand.
export function formToMarkdown(form: PolicyForm): string {
    const parts = [`# ${form.title}`]
    if (form.intro) parts.push(noHeadings(form.intro))
    for (const section of form.sections) parts.push(`## ${section.heading}\n${noHeadings(section.body)}`)
    return parts.join('\n\n') + '\n'
}

// The form → a plain-text file in the official policy layout (see POLICY_LAYOUT_RULES).
// Lets the admin download what they typed as a file that uploads back unchanged.
export function formToLayoutText(form: { title: string; intro?: string; sections: { heading: string; body: string }[] }): string {
    const parts = [form.title.trim()]
    if (form.intro?.trim()) parts.push(form.intro.trim())
    form.sections.forEach((section, i) => parts.push(`${i + 1}. ${section.heading.trim()}\n${section.body.trim()}`))
    return parts.join('\n\n') + '\n'
}

// Lines inside a section's text that start with a number ("1. ", "2) "). The layout keeps
// numbers for section headings only, so the form flags these the same way an upload would.
export function numberedBodyLines(body: string): string[] {
    // Also catches a bare "1." while the admin is still typing the line.
    return body.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^\d{1,2}[.)](\s|$)/.test(l))
}

// "1. Requesting leave" typed into a heading box → "Requesting leave": the form adds the number.
export const stripHeadingNumber = (heading: string) => heading.replace(/^\s*\d{1,2}[.)]\s*/, '')

// The reverse, for the seed files (# title, intro, ## sections). Maintainer comments are dropped.
export function markdownToForm(markdown: string): PolicyForm {
    const lines = markdown.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)
    let title = ''
    const intro: string[] = []
    const sections: { heading: string; body: string[] }[] = []
    for (const line of lines) {
        const h1 = /^#\s+(.+)$/.exec(line)
        const h2 = /^##\s+(.+)$/.exec(line)
        if (h1?.[1] && !title) title = h1[1].trim()
        else if (h2?.[1]) sections.push({ heading: h2[1].trim(), body: [] })
        else (sections.at(-1)?.body ?? intro).push(line)
    }
    return {
        title,
        intro: intro.join('\n').trim() || undefined,
        sections: sections.map((s) => ({ heading: s.heading, body: s.body.join('\n').trim() })),
    }
}

// ---- Uploaded file text → form ---------------------------------------------------
// Every uploaded policy must follow ONE layout, whatever the file type (Word, PDF, text).
// The file-type code (policy-file.ts) only turns the file into lines of text; this one
// function then reads the layout. So a new or oddly formatted file never needs a new
// reader: it either follows the layout, or it is rejected with the reasons.
//
// The layout (shown to admins on the Policy page as POLICY_LAYOUT_RULES):
//   - The first line is the policy title.
//   - Any text before section 1 is the introduction (optional).
//   - Each section starts with a numbered heading on its own line: "1. Requesting leave".
//     Numbers go 1, 2, 3... in order. Typed numbers and Word's automatic numbering both work.
//   - Everything under a heading is that section's text. A list inside a section uses bullet
//     points, or numbers when it has two or more items in a row (see looksLikeHeading).
//   - Word only: a Heading 1 line is a section heading too (docx.ts numbers it).

export const POLICY_LAYOUT_RULES = [
    'The first line is the policy title.',
    'Text before the first section is the introduction (optional).',
    'Each section starts with a numbered heading on its own line, for example "1. Requesting leave". Number them 1, 2, 3 in order.',
    'Everything under a heading is that section’s text. A list inside a section can use bullet points, or numbers if it has two or more items in a row.',
    'In Word, a line in the Heading 1 style also counts as a section heading; its number is added for you.',
] as const

// The file types the Policy page accepts. Kept here (not in policy-file.ts) because the
// browser needs it too, and policy-file.ts pulls in the server-only file readers.
export const POLICY_FILE_EXTENSIONS = ['.docx', '.pdf', '.txt', '.md', '.html', '.htm'] as const

// kind 'file': the file itself can't be used (wrong type, unreadable, no text), as opposed
// to a readable file that doesn't follow the layout. The Policy page words the two differently.
export type PolicyLayoutResult = { ok: true; form: PolicyForm } | { ok: false; problems: string[]; kind?: 'file' | 'layout' }

const HEADING = /^(\d{1,2})[.)]\s+(\S.*)$/
const BULLET = /^\s*[•●▪◦‣\-*–]\s+/
const MAX_PROBLEMS = 8 // enough to fix the file; a list of 200 helps nobody

// Numbered lines are section headings, EXCEPT inside a numbered list. A line is a list item
// when it continues a list (the line before was item n-1) or starts one (the next line is
// item n+1). When a line could be either (its number is also the next section's number),
// it is a heading only if it LOOKS like one: short, and not ending like a sentence.
// So "1. WHS induction." "2. Privacy." "3. Respect at Work." inside a section stay a list,
// and the next section "3. Who to contact" is still a heading.
const looksLikeHeading = (text: string) => !/[.!?;:,]$/.test(text) && text.split(/\s+/).length <= 10

// `wrappedLines`: true for PDF, where a paragraph is printed over several lines and has to
// be joined back together. Word and text files already give one line per paragraph.
export function parsePolicyText(text: string, options: { wrappedLines: boolean }): PolicyLayoutResult {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
    if (lines.length === 0) return { ok: false, kind: 'file', problems: ['No text could be read from this file. If it is a scanned PDF, use "Write a policy" instead.'] }

    const problems: string[] = []
    const title = lines[0] ?? ''
    if (HEADING.test(title)) problems.push(`The first line must be the policy title, but it is a numbered heading: "${title}".`)

    // The longest line shows the page width. In a PDF, a line that ends a sentence well short
    // of that width ends a paragraph; a full-width line just wrapped onto the next.
    const pageWidth = Math.max(0, ...lines.map((l) => l.length))
    const endsParagraph = (line: string) => !options.wrappedLines || (/[.!?:]$/.test(line) && line.length < pageWidth * 0.75)

    const intro: string[] = []
    const sections: { heading: string; body: string[] }[] = []
    let joinNext = false
    const rest = lines.slice(1)
    const numberOf = (line: string | undefined) => {
        const match = line === undefined ? null : HEADING.exec(line)
        return match?.[1] ? Number(match[1]) : null
    }
    let lastListItem: number | null = null // the number of the list item on the line before

    rest.forEach((line, index) => {
        const lineNo = index + 2
        const heading = HEADING.exec(line)
        if (heading?.[1] && heading[2]) {
            const n = Number(heading[1])
            const expected = sections.length + 1
            const inList = lastListItem === n - 1 || numberOf(rest[index + 1]) === n + 1
            if (n === expected && (!inList || looksLikeHeading(heading[2].trim()))) {
                sections.push({ heading: heading[2].trim(), body: [] })
                joinNext = false
                lastListItem = null
                return
            }
            if (inList) {
                // An item of a numbered list inside the section: kept exactly as written.
                ;(sections.at(-1)?.body ?? intro).push(line)
                joinNext = false
                lastListItem = n
                return
            }
            // A numbered line that is not the next section: kept as text, but reported, because
            // either a heading is missing or a list inside a section uses numbers.
            problems.push(`Line ${lineNo}: "${line.slice(0, 60)}" is numbered ${heading[1]}, but the next section should be ${expected}. A single numbered line is read as a section heading: use a bullet point instead, or a numbered list of two or more lines.`)
        }
        lastListItem = null
        const body = sections.at(-1)?.body ?? intro
        if (BULLET.test(line)) {
            body.push(`- ${line.replace(BULLET, '')}`)
            joinNext = false
        } else if (joinNext && body.length > 0) {
            body[body.length - 1] += ` ${line}`
        } else {
            body.push(line)
        }
        joinNext = !BULLET.test(line) && !endsParagraph(line)
    })

    if (sections.length === 0) {
        problems.push('No numbered section headings were found. Start each section with a line like "1. Requesting leave".')
    }
    sections.forEach((section, i) => {
        if (section.body.length === 0) {
            // A "heading" that reads like a sentence is usually a numbered list item: in Word, a
            // numbered list inside a section carries on the heading numbers, so it looks like
            // the next sections. Say so, or the admin is left looking for a missing paragraph.
            const looksLikeListItem = /[.!?]$/.test(section.heading)
            problems.push(
                `Section ${i + 1} ("${section.heading.slice(0, 60)}") has no text under it.` +
                    (looksLikeListItem
                        ? ' It looks like a numbered list item: use bullet points for lists inside a section.'
                        : ' If it is an item of a numbered list, end each item with a full stop, or use bullet points.')
            )
        }
    })

    const form = {
        title,
        intro: intro.join('\n') || undefined,
        sections: sections.map((s) => ({ heading: s.heading, body: s.body.join('\n') })),
    }
    // Length and count limits come from the same schema the form uses, so they can't drift.
    if (problems.length === 0) {
        const parsed = policyFormSchema.safeParse(form)
        if (parsed.success) return { ok: true, form: parsed.data }
        for (const issue of parsed.error.issues) problems.push(describeIssue(issue.path, issue.message))
    }
    return { ok: false, kind: 'layout', problems: problems.slice(0, MAX_PROBLEMS) }
}

// Turns a schema error into words an admin can act on.
function describeIssue(path: PropertyKey[], message: string): string {
    const [field, index, part] = path
    if (field === 'title') {
        return message.startsWith('The title needs') ? `${message} The title is the file's first line.` : `The title (first line) must be between 3 and 120 characters. ${message}`
    }
    if (field === 'intro') return 'The introduction is too long (4,000 characters at most).'
    if (field === 'sections' && typeof index === 'number') {
        return part === 'heading'
            ? `Section ${index + 1}'s heading is too long (120 characters at most).`
            : `Section ${index + 1}'s text is too long (8,000 characters at most). Split it into two sections.`
    }
    if (field === 'sections') return 'A policy can have at most 50 sections.'
    return message
}
