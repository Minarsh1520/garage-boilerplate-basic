import { extractText, getDocumentProxy } from 'unpdf'

// Every PDF file starts with these five bytes. Checked so a renamed file of another
// type is rejected with a clear message instead of a confusing parser error.
export function isPdf(bytes: Uint8Array): boolean {
    return bytes.length > 4 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-'
}

// PDF → plain text, one line per printed line. unpdf is a pure-JS build of Mozilla's
// PDF.js made for servers, so it runs in a Server Action with no native libraries.
// A scanned PDF (pictures of text) has no text layer and returns "".
// Pages are read separately so page headers, footers and page numbers can be removed.
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
    const pdf = await getDocumentProxy(bytes)
    const { text } = await extractText(pdf, { mergePages: false })
    return removePageFurniture(Array.isArray(text) ? text : [text])
}

// A line that is only a page number: "2", "Page 2", "Page 2 of 5", "2 / 5", "- 2 -".
const PAGE_NUMBER = /^[-–\s]*(page\s*)?\d{1,4}(\s*(of|\/)\s*\d{1,4})?[-–\s]*$/i
// Repeated lines are compared with their numbers blanked out, so "Leave Policy · Page 2"
// and "Leave Policy · Page 3" count as the same footer.
const comparable = (line: string) => line.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim()
const MAX_FURNITURE_LENGTH = 100 // a header or footer is a short line, never a paragraph

// Removes page headers and footers: short lines that appear on most pages (60% or more,
// and at least 2), and lines that are only page numbers. If that removes the policy's
// title too (a header that repeats the title on every page), the first removed line of
// page 1 is put back as the title.
export function removePageFurniture(pages: string[]): string {
    const pageLines = pages.map((page) => page.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
    const pagesWith = new Map<string, number>()
    if (pageLines.length >= 2) {
        for (const lines of pageLines) {
            for (const key of new Set(lines.filter((l) => l.length <= MAX_FURNITURE_LENGTH).map(comparable))) {
                pagesWith.set(key, (pagesWith.get(key) ?? 0) + 1)
            }
        }
    }
    const repeatedOn = Math.max(2, Math.ceil(pageLines.length * 0.6))
    const isFurniture = (line: string) =>
        PAGE_NUMBER.test(line) || (line.length <= MAX_FURNITURE_LENGTH && (pagesWith.get(comparable(line)) ?? 0) >= repeatedOn)

    const kept = pageLines.flatMap((lines) => lines.filter((line) => !isFurniture(line)))
    // The document should start with its title, not a numbered section. If it now does,
    // the title was a repeated header: bring back page 1's first header line.
    const firstHeader = pageLines[0]?.find((line) => isFurniture(line) && !PAGE_NUMBER.test(line))
    if (firstHeader && /^\d{1,2}[.)]\s/.test(kept[0] ?? '')) kept.unshift(firstHeader)
    return kept.join('\n')
}
