import mammoth from 'mammoth'
import { htmlToLines } from './html'

// Word (.docx) → plain lines of text, in the same shape the policy layout reader expects.
// mammoth turns the document into simple HTML, which html.ts then turns into lines:
//   - Word's automatic numbering becomes "1. ", "2. "... mammoth starts a new HTML list
//     after every paragraph in between, so the count runs through the WHOLE document,
//     as it does on screen for auto-numbered headings (numberAcrossLists).
//   - Bullet points, and any list inside another list, become "- ".
// Images, comments and formatting are dropped: only the words matter.
// usesHeadingStyles: true when the document uses Word's Heading styles, so the caller can
// explain why style-based heading numbers went missing (see policy-file.ts).
export async function extractDocxText(bytes: Uint8Array): Promise<{ text: string; usesHeadingStyles: boolean }> {
    const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) })
    return { text: htmlToLines(html, { numberAcrossLists: true }), usesHeadingStyles: /<h[1-6][\s>]/i.test(html) }
}
