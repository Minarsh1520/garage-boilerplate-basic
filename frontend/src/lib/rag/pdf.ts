import { extractText, getDocumentProxy } from 'unpdf'

// Every PDF file starts with these five bytes. Checked so a renamed file of another
// type is rejected with a clear message instead of a confusing parser error.
export function isPdf(bytes: Uint8Array): boolean {
    return bytes.length > 4 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-'
}

// PDF → plain text, one line per printed line, pages joined. unpdf is a pure-JS build
// of Mozilla's PDF.js made for servers, so it runs in a Server Action with no native
// libraries. A scanned PDF (pictures of text) has no text layer and returns "".
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
    const pdf = await getDocumentProxy(bytes)
    const { text } = await extractText(pdf, { mergePages: true })
    return text
}
