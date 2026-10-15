export interface Chunk { chunkIndex: number; headingPath: string; text: string }

// ≈500 tokens. Kept well under gemini-embedding-001's 2,048-token input limit,
// because the embedded text is contextualised: context (≈100 tokens) + chunk.
const MAX_CHARS = 2000
// Tail carried into the next piece so a sentence split across a boundary is still findable.
const OVERLAP_CHARS = 200

// Split on the document's own structure (Markdown headings) instead of every N
// characters, so a rule and its conditions stay together. Only sections that are
// still too long are split further, at paragraph boundaries.
export function chunkMarkdown(markdown: string): Chunk[] {
    const sections: { headingPath: string; body: string }[] = []
    const path: string[] = []
    let buffer: string[] = []

    const flush = () => {
        const body = buffer.join('\n').trim()
        if (body) sections.push({ headingPath: path.join(' > '), body })
        buffer = []
    }
    // HTML comments are notes for maintainers (e.g. "placeholder file"), not policy text:
    // removed here so they are never embedded or shown to an employee.
    const content = markdown.replace(/<!--[\s\S]*?-->/g, '')

    // Splits on Windows (\r\n) and Unix (\n) line endings alike. With a plain '\n' split, a file
    // saved with Windows endings keeps a hidden \r on every line and no heading is recognised.
    for (const line of content.split(/\r?\n/)) {
        const heading = /^(#{1,3})\s+(.+)$/.exec(line)
        if (heading?.[1] && heading[2]) {
        flush()
        // Level N replaces position N-1 and drops anything deeper:
        // a new H2 ends the previous H2 and every H3 under it.
        path.splice(heading[1].length - 1, path.length, heading[2].trim())
        continue
        }
        buffer.push(line)
    }
    flush()

    return sections
        .flatMap(splitLongSection)
        .map((chunk, chunkIndex) => ({ ...chunk, chunkIndex }))
}

// Splits text that is too long for one chunk into pieces of at most MAX_CHARS, at the
// most natural boundary available: lines first, then sentence ends, then spaces. Only a
// single "word" longer than MAX_CHARS (a pasted link, say) is cut mid-word.
export function splitOversized(text: string): string[] {
    if (text.length <= MAX_CHARS) return [text]
    for (const boundary of [/(?<=\n)/, /(?<=[.!?])\s+/, /\s+/]) {
        const parts = text.split(boundary).filter((p) => p.trim())
        if (parts.length > 1) {
            // Pack the parts back together up to MAX_CHARS, then split any still too long.
            const packed: string[] = []
            let current = ''
            for (const part of parts) {
                if (current && current.length + part.length + 1 > MAX_CHARS) {
                    packed.push(current)
                    current = ''
                }
                current = current ? `${current}${current.endsWith('\n') ? '' : ' '}${part}` : part
            }
            if (current) packed.push(current)
            return packed.flatMap((piece) => (piece.length > MAX_CHARS ? splitOversized(piece) : [piece.trim()]))
        }
    }
    const pieces: string[] = []
    for (let i = 0; i < text.length; i += MAX_CHARS) pieces.push(text.slice(i, i + MAX_CHARS))
    return pieces
}

// Sections are packed paragraph by paragraph. A paragraph that is too long on its own is
// first split by splitOversized, so no chunk is ever bigger than the embedding model can
// take: a section near the 8,000-character limit used to be one oversized chunk.
// Known limit: the overlap may start mid-word.
function splitLongSection({ headingPath, body }: { headingPath: string; body: string }) {
    if (body.length <= MAX_CHARS) return [{ headingPath, text: body }]

    const pieces: string[] = []
    let current = ''
    for (const paragraph of body.split(/\n\s*\n/).flatMap(splitOversized)) {
        if (current && current.length + paragraph.length > MAX_CHARS) {
            pieces.push(current)
            current = current.slice(-OVERLAP_CHARS)
        }
        current = current ? `${current}\n\n${paragraph}` : paragraph
    }
    if (current) pieces.push(current)
    return pieces.map((text) => ({ headingPath, text }))
}
