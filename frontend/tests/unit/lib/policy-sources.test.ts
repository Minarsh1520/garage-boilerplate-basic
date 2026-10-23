import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { chunkMarkdown } from '@/lib/rag/chunker'
import {
    formToLayoutText,
    formToMarkdown,
    markdownToForm,
    numberedBodyLines,
    parsePolicyText,
    policyFormSchema,
    slugify,
    stripHeadingNumber,
} from '@/lib/rag/policy-sources'

describe('slugify', () => {
    it('gives the same id the seed file has, so publishing replaces instead of duplicating', () => {
        expect(slugify('Leave Policy')).toBe('leave-policy')
        expect(slugify('  IT & System Access Guide! ')).toBe('it-system-access-guide')
        expect(slugify('!!!')).toMatch(/^policy-[a-z0-9]+$/)
        expect(slugify('請假政策')).toBe(slugify('請假政策')) // same title, same id
        expect(slugify('請假政策')).not.toBe(slugify('薪資政策'))
        expect(slugify('')).toBe('')
    })
})

describe('form ↔ Markdown', () => {
    it('round-trips every seed policy, and the chunker sees the same sections', () => {
        for (const file of readdirSync('seed/policies')) {
            const markdown = readFileSync(`seed/policies/${file}`, 'utf8')
            const form = markdownToForm(markdown)
            expect(policyFormSchema.safeParse(form).success, file).toBe(true)
            const headings = (md: string) => chunkMarkdown(md).map((c) => c.headingPath)
            expect(headings(formToMarkdown(form)), file).toEqual(headings(markdown))
        }
    })

    it('stops a "#" typed in the body from becoming a new section', () => {
        const md = formToMarkdown({ title: 'T', sections: [{ heading: 'A', body: '# not a heading\ntext' }] })
        expect(chunkMarkdown(md).map((c) => c.headingPath)).toEqual(['T > A'])
    })
})

describe('parsePolicyText: the one policy layout', () => {
    const read = (lines: string[], wrappedLines = false) => parsePolicyText(lines.join('\n'), { wrappedLines })

    it('reads title, introduction, numbered sections and bullet points', () => {
        expect(read(['IT Guide', 'Read this first.', '1. Contacts', 'Call the service desk:', '• Email: it@example', '2. Passwords', 'Never share it.'])).toEqual({
            ok: true,
            form: {
                title: 'IT Guide',
                intro: 'Read this first.',
                sections: [
                    { heading: 'Contacts', body: 'Call the service desk:\n- Email: it@example' },
                    { heading: 'Passwords', body: 'Never share it.' },
                ],
            },
        })
    })

    it('joins the wrapped lines of a PDF paragraph back together', () => {
        const result = read(['Guide', '1. Passwords', 'Change your temporary password on first login and never share it with anyone, including', 'IT Support staff.'], true)
        expect(result.ok && result.form.sections[0]?.body).toBe('Change your temporary password on first login and never share it with anyone, including IT Support staff.')
    })

    it('rejects a file with no numbered headings, and says how to fix it', () => {
        const result = read(['Leave Policy', 'Types of leave', 'Some text.'])
        expect(result.ok).toBe(false)
        expect(!result.ok && result.problems.join(' ')).toMatch(/No numbered section headings.*"1\. Requesting leave"/)
    })

    it('keeps a numbered list inside a section, and still finds the next section', () => {
        const result = read(['Guide', '1. Training', 'Modules:', '1. WHS induction.', '2. Privacy.', '3. Respect at Work.', '2. Who to contact', 'Email HR.'])
        expect(result).toMatchObject({
            ok: true,
            form: { sections: [{ heading: 'Training', body: 'Modules:\n1. WHS induction.\n2. Privacy.\n3. Respect at Work.' }, { heading: 'Who to contact' }] },
        })
        // A two-step list in section 2, then section 3: "3. Contacts" is a heading, not step 3.
        const steps = read(['Guide', '1. A', 'x.', '2. Steps', 'Do this:', '1. Log in.', '2. Click.', '3. Contacts', 'Email.'])
        expect(steps.ok && steps.form.sections.map((s) => s.heading)).toEqual(['A', 'Steps', 'Contacts'])
    })

    it('rejects a single numbered line that is not the next section, naming the line', () => {
        const result = read(['Guide', '1. Training', 'Note:', '4. Odd line', 'More.'])
        expect(!result.ok && result.problems[0]).toMatch(/Line 4: "4\. Odd line" is numbered 4, but the next section should be 2/)
    })

    it('rejects a section with no text, a numbered first line, and an empty file', () => {
        expect(read(['Guide', '1. Empty', '2. Full', 'Text.'])).toMatchObject({ ok: false, problems: [expect.stringMatching(/Section 1 \("Empty"\) has no text/)] })
        expect(read(['1. Not a title', 'Text.'])).toMatchObject({ ok: false, problems: expect.arrayContaining([expect.stringMatching(/first line must be the policy title/)]) })
        expect(read(['   '])).toMatchObject({ ok: false, problems: [expect.stringMatching(/No text could be read/)] })
    })

    it('when list items look like headings, says how to fix it instead of misreading silently', () => {
        const result = read(['Guide', '1. Training', 'Modules:', '1. WHS', '2. Privacy', '3. Respect', '2. Next', 'x.'])
        expect(!result.ok && result.problems.join(' ')).toMatch(/end each item with a full stop/)
    })

    it('explains a size limit in plain words', () => {
        const result = read(['Guide', '1. Long', 'x'.repeat(8001)])
        expect(!result.ok && result.problems[0]).toMatch(/Section 1's text is too long/)
    })
})

describe('the typed form follows the same layout as files', () => {
    it('a typed policy downloaded as a file reads back as the same policy', () => {
        for (const file of readdirSync('seed/policies')) {
            const form = markdownToForm(readFileSync(`seed/policies/${file}`, 'utf8'))
            // Includes the Onboarding Guide, whose numbered list of training modules stays a list.
            // Blank lines inside a section aren't kept by the layout; everything else must match.
            const noBlankLines = { ...form, sections: form.sections.map((s) => ({ ...s, body: s.body.replace(/\n\s*\n/g, '\n') })) }
            expect(parsePolicyText(formToLayoutText(form), { wrappedLines: false }), file).toEqual({ ok: true, form: noBlankLines })
        }
    })

    it('flags numbered lines in a section and strips a number typed into a heading', () => {
        expect(numberedBodyLines('Intro.\n1. First\n- ok\n2) Second\n3.')).toEqual(['1. First', '2) Second', '3.'])
        expect(numberedBodyLines('In 2026. we moved.\n1.5 hours')).toEqual([])
        expect(stripHeadingNumber('3. Requesting leave')).toBe('Requesting leave')
        expect(stripHeadingNumber('Requesting leave')).toBe('Requesting leave')
    })
})

describe('policy titles', () => {
    it('need at least one letter or number, in any language', () => {
        const form = (title: string) => policyFormSchema.safeParse({ title, sections: [{ heading: 'A', body: 'x' }] }).success
        expect(form('🙂🙂🙂')).toBe(false)
        expect(form('請假政策')).toBe(true)
        expect(form('Leave Policy')).toBe(true)
    })
})

