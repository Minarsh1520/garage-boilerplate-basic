import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { htmlToLines } from '@/lib/rag/html'
import { removePageFurniture } from '@/lib/rag/pdf'
import { markdownToLines } from '@/lib/rag/markdown'
import { detectPolicyFileType, readPolicyFile } from '@/lib/rag/policy-file'
import { markdownToForm } from '@/lib/rag/policy-sources'

// The same Leave Policy saved five ways, all in the numbered layout:
//   .docx  Word's automatic numbering for headings, real bullet points
//   .pdf   printed from that Word file
//   .txt   typed numbers and "-" bullets
//   .md    "## 1. Heading" headings, bold/italic, a wrapped paragraph, a mailto link, a --- rule
//   .html  a <head> with <script>/<style>, <h2> headings, one heading as <ol start="3">, entities
const fixture = (name: string) => new Uint8Array(readFileSync(`tests/fixtures/${name}`))

// What all three must read as: the seed policy, plus the two bullet points added to section 2.
const seed = markdownToForm(readFileSync('seed/policies/leave-policy.md', 'utf8'))
const EXPECTED = {
    ...seed,
    sections: seed.sections.map((s, i) =>
        i === 1 ? { ...s, body: `${s.body}\n- Planned leave: at least two weeks ahead\n- Unplanned leave: tell your manager on the day` } : s
    ),
}

describe('readPolicyFile', () => {
    it.each(['leave-policy.docx', 'leave-policy.pdf', 'leave-policy.txt', 'leave-policy.md', 'leave-policy.html'])('reads %s into the same policy', async (name) => {
        expect(await readPolicyFile(name, fixture(name))).toEqual({ ok: true, form: EXPECTED })
    })

    it('refuses a file whose contents do not match its name', async () => {
        const result = await readPolicyFile('policy.pdf', fixture('leave-policy.txt'))
        expect(result).toMatchObject({ ok: false, kind: 'file', problems: [expect.stringMatching(/contents don't match its name \(\.pdf\).*renaming a file doesn't change its type/)] })
    })

    it('tells the admin to re-save an old .doc file', async () => {
        expect(await readPolicyFile('old.doc', new Uint8Array([1, 2, 3]))).toMatchObject({ ok: false, problems: [expect.stringMatching(/Save As.*\.docx/)] })
    })

    it('reads Word Heading 1 lines as numbered sections, even when Word numbers them itself', async () => {
        // Heading 1 style with Word's numbering: the numbers show in Word but aren't saved as text.
        expect(await readPolicyFile('styled.docx', fixture('heading-styles.docx'))).toEqual({
            ok: true,
            form: {
                title: 'Styled Policy',
                sections: [
                    { heading: 'Leave types', body: 'Annual leave is 20 days.\nType | Days\nAnnual | 20' },
                    { heading: 'Contacts', body: 'Email HR.' },
                ],
            },
        })
    })

    it('tells the admin to use Heading 1 when a Word file only has smaller headings', async () => {
        const result = await readPolicyFile('sub.docx', fixture('heading2-only.docx'))
        expect(result).toMatchObject({ ok: false, problems: [expect.stringMatching(/No numbered/), expect.stringMatching(/Heading 1 style/)] })
    })

    it('reads UTF-16 text files, as older Notepad saves them', async () => {
        const text = 'Leave Policy\n1. Requesting leave\nUse the portal.'
        const utf16 = new Uint8Array([0xff, 0xfe, ...[...text].flatMap((c) => [c.charCodeAt(0), 0])])
        expect(await readPolicyFile('notepad.txt', utf16)).toMatchObject({ ok: true, form: { title: 'Leave Policy' } })
    })

    it('detects each type by its contents', () => {
        expect(detectPolicyFileType('a.docx', fixture('leave-policy.docx'))).toBe('docx')
        expect(detectPolicyFileType('a.pdf', fixture('leave-policy.pdf'))).toBe('pdf')
        expect(detectPolicyFileType('a.txt', fixture('leave-policy.txt'))).toBe('txt')
        expect(detectPolicyFileType('a.md', fixture('leave-policy.md'))).toBe('md')
        expect(detectPolicyFileType('a.htm', fixture('leave-policy.html'))).toBe('html')
        expect(detectPolicyFileType('a.txt', fixture('leave-policy.pdf'))).toBeNull() // binary, not text
        expect(detectPolicyFileType('a.html', fixture('leave-policy.docx'))).toBeNull()
    })
})

describe('htmlToLines (Word)', () => {
    it('keeps automatic heading numbers running through the document, and turns other lists into bullets', () => {
        const html = '<p>Title</p><ol><li>One</li></ol><p>Text.</p><ul><li>Point &amp; more</li></ul><ol><li>Two<ol><li>Nested</li></ol></li></ol>'
        expect(htmlToLines(html, { word: true })).toBe('Title\n1. One\nText.\n- Point & more\n2. Two\n- Nested')
    })

    it('numbers a list of two or more items on its own, without using up heading numbers', () => {
        const html = '<p>T</p><ol><li>Who</li></ol><p>x</p><ol><li>a</li><li>b</li></ol><ol><li>Next</li></ol><p>y</p>'
        expect(htmlToLines(html, { word: true })).toBe('T\n1. Who\nx\n1. a\n2. b\n2. Next\ny')
    })

    it('numbers Heading 1 lines as sections, keeping a typed number', () => {
        expect(htmlToLines('<p>T</p><h1>Leave</h1><p>x</p><h1>2. Pay</h1><p>y</p><h1>Contacts</h1>', { word: true })).toBe('T\n1. Leave\nx\n2. Pay\ny\n3. Contacts')
    })
})

describe('htmlToLines (start at the first h1)', () => {
    it('drops a banner before the first h1, so it cannot become the title', () => {
        expect(htmlToLines('<header><p>Northbridge Intranet</p></header><h1>Leave Policy</h1><h2>1. A</h2>', { startAtFirstH1: true })).toBe('Leave Policy\n1. A')
        expect(htmlToLines('<p>No h1 here</p>', { startAtFirstH1: true })).toBe('No h1 here')
    })
})

describe('htmlToLines (web pages)', () => {
    it('numbers each list the way a browser shows it, so restarted lists are caught by the layout check', () => {
        expect(htmlToLines('<ol><li>A</li></ol><p>x</p><ol><li>B</li></ol>')).toBe('1. A\nx\n1. B')
        expect(htmlToLines('<ol start="2"><li>B</li><li>C</li></ol>')).toBe('2. B\n3. C')
    })

    it('keeps a lone "<" that is part of the text', () => {
        expect(htmlToLines('<p>Under 5 days < 1 week</p>')).toBe('Under 5 days < 1 week')
    })

    it('never keeps script, style, menu or comment text', () => {
        expect(htmlToLines('<nav><a href="/">Home</a></nav><p>Hi</p><script>alert("x")</script><style>p{}</style><!-- note -->')).toBe('Hi')
    })

    it('keeps a link address only when it adds something', () => {
        expect(htmlToLines('<p>See <a href="https://portal.example">the portal</a>.</p>')).toBe('See the portal (https://portal.example).')
        expect(htmlToLines('<p><a href="mailto:hr@x.example">hr@x.example</a></p>')).toBe('hr@x.example')
        expect(htmlToLines('<p><a href="javascript:alert(1)">click</a></p>')).toBe('click')
    })

    it('puts table cells side by side on one line', () => {
        expect(htmlToLines('<table><tr><th>Leave</th><th>Days</th></tr><tr><td>Annual</td><td>20</td></tr></table>')).toBe('Leave | Days\nAnnual | 20')
    })
})

describe('markdownToLines', () => {
    it('removes the marks but keeps the words, and joins a wrapped paragraph', () => {
        const md = '# Title\n\nOne line\nand the next.\n\n## 1. **Leave**\n* a _point_\n+ b\n> quoted `code`\n\n| A | B |\n|---|---|\n| 1 | 2 |'
        expect(markdownToLines(md)).toBe('Title\nOne line and the next.\n1. Leave\n- a point\n- b\nquoted code\nA | B\n1 | 2')
    })

    it('keeps snake_case words and link addresses that add something', () => {
        expect(markdownToLines('Use my_leave_form at [the portal](https://portal.example).')).toBe('Use my_leave_form at the portal (https://portal.example).')
    })

    it('does not treat a "## Heading" without a number as a section, like every other file type', async () => {
        const result = await readPolicyFile('p.md', new TextEncoder().encode('# Leave\n\n## Types of leave\nText.'))
        expect(result).toMatchObject({ ok: false, problems: [expect.stringMatching(/No numbered section headings/)] })
    })
})

describe('removePageFurniture (PDF)', () => {
    it('drops repeated headers, footers and page numbers, but keeps the title', () => {
        const pages = [
            'Leave Policy\nNorthbridge Digital · Internal\n1. Types\nAnnual leave.\nPage 1 of 3',
            'Northbridge Digital · Internal\n2. Requesting\nUse the portal.\nPage 2 of 3',
            'Northbridge Digital · Internal\n3. Approval\nYour manager approves.\n3',
        ]
        expect(removePageFurniture(pages)).toBe('Leave Policy\n1. Types\nAnnual leave.\n2. Requesting\nUse the portal.\n3. Approval\nYour manager approves.')
    })

    it('drops a header that comes before the title on page 1', () => {
        const pages = ['Company · Internal\nParking Policy\n1. A\nx.', 'Company · Internal\n2. B\ny.', 'Company · Internal\n3. C\nz.']
        expect(removePageFurniture(pages)).toBe('Parking Policy\n1. A\nx.\n2. B\ny.\n3. C\nz.')
    })

    it('keeps a title that a header repeats on every page', () => {
        expect(removePageFurniture(['Leave Policy\n1. A\nx.', 'Leave Policy\ny.'])).toBe('Leave Policy\n1. A\nx.\ny.')
    })
})

describe('markdownToLines code blocks', () => {
    it('keeps code lines inside backticks, so they are never read as headings', () => {
        expect(markdownToLines('# T\n```\n2. something\n```')).toBe('T\n`2. something`')
    })
})

