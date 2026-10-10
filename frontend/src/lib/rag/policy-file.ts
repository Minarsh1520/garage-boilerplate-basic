import { extractDocxText } from './docx'
import { htmlToLines } from './html'
import { markdownToLines } from './markdown'
import { extractPdfText, isPdf } from './pdf'
import { parsePolicyText, POLICY_FILE_EXTENSIONS, type PolicyLayoutResult } from './policy-sources'

// The only file-type-specific step: turn the file into lines of text. The layout is then
// read by ONE function, parsePolicyText(), so every file type is held to the same layout.
// Adding a type later means adding a case here, never a new layout reader.
export type PolicyFileType = 'pdf' | 'docx' | 'txt' | 'md' | 'html'

// Checked by the file's CONTENT as well as its name, so a renamed file can't slip through.
export function detectPolicyFileType(fileName: string, bytes: Uint8Array): PolicyFileType | null {
    const name = fileName.toLowerCase()
    if (name.endsWith('.pdf')) return isPdf(bytes) ? 'pdf' : null
    // A .docx is a zip archive, which always starts with "PK\x03\x04".
    if (name.endsWith('.docx')) return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4 ? 'docx' : null
    // Text-based types must really be text (not a binary file renamed).
    const isText = readText(bytes) !== null
    if (name.endsWith('.txt')) return isText ? 'txt' : null
    if (name.endsWith('.md')) return isText ? 'md' : null
    if (name.endsWith('.html') || name.endsWith('.htm')) return isText ? 'html' : null
    return null
}

// The file as text, or null when it isn't text (e.g. a binary file renamed to .txt).
// UTF-8 is the norm; UTF-16 is accepted too when the file says so with a byte-order mark,
// because older Windows Notepad saves "Unicode" text that way.
function readText(bytes: Uint8Array): string | null {
    const utf16 = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : null
    try {
        if (utf16) return new TextDecoder(utf16, { fatal: true }).decode(bytes.subarray(2))
        if (bytes.includes(0)) return null
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
    } catch {
        return null
    }
}

export async function readPolicyFile(fileName: string, bytes: Uint8Array): Promise<PolicyLayoutResult> {
    if (fileName.toLowerCase().endsWith('.doc')) {
        return { ok: false, kind: 'file', problems: ['Older Word files (.doc) can’t be read. In Word, use File > Save As and choose .docx.'] }
    }
    const type = detectPolicyFileType(fileName, bytes)
    if (!type) {
        // e.g. a text file renamed to .pdf: the name says PDF, the contents don't.
        return {
            ok: false,
            kind: 'file',
            problems: [`This file's contents don't match its name (${fileName.slice(fileName.lastIndexOf('.'))}). Only ${POLICY_FILE_EXTENSIONS.join(', ')} files are supported, and the file must really be that type: renaming a file doesn't change its type.`],
        }
    }

    switch (type) {
        case 'pdf':
            return parsePolicyText(await extractPdfText(bytes), { wrappedLines: true })
        case 'docx': {
            const { text, usesHeadingStyles } = await extractDocxText(bytes)
            const result = parsePolicyText(text, { wrappedLines: false })
            // Word's heading styles can show automatic numbers on screen, but those numbers are
            // not saved as text, so they never reach us. Say so, or the error is a mystery.
            if (!result.ok && usesHeadingStyles && result.problems.some((p) => p.startsWith('No numbered section headings'))) {
                result.problems.push('This file uses Word heading styles. If their numbers come from Word’s heading numbering, Word does not save them as text: type the numbers into the headings, or number the headings with a normal numbered list.')
            }
            return result
        }
        case 'txt':
            return parsePolicyText(readText(bytes) ?? '', { wrappedLines: false })
        case 'md':
            return parsePolicyText(markdownToLines(readText(bytes) ?? ''), { wrappedLines: false })
        case 'html':
            return parsePolicyText(htmlToLines(readText(bytes) ?? ''), { wrappedLines: false })
    }
}
