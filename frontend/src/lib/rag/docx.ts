import mammoth from 'mammoth'
import { htmlToLines } from './html'

// Word (.docx) → plain lines of text, in the same shape the policy layout reader expects.
// mammoth turns the document into simple HTML, which html.ts then turns into lines
// (see HtmlToLinesOptions.word for how Word's numbering and Heading 1 are read):
//   - an auto-numbered heading becomes "1. ", "2. "..., counting through the whole document;
//   - a numbered list of two or more items inside a section keeps its own 1, 2, 3;
//   - a Heading 1 paragraph becomes the next numbered heading;
//   - bullet points, and any list inside another list, become "- ".
// Images, comments and formatting are dropped: only the words matter.
// subHeadingsOnly: the document uses Heading 2 (or lower) styles but never Heading 1, so the
// caller can explain why no sections were found (see policy-file.ts).
export async function extractDocxText(bytes: Uint8Array): Promise<{ text: string; subHeadingsOnly: boolean }> {
    const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) })
    const subHeadingsOnly = /<h[2-6][\s>]/i.test(html) && !/<h1[\s>]/i.test(html)
    return { text: htmlToLines(html, { word: true }), subHeadingsOnly }
}
