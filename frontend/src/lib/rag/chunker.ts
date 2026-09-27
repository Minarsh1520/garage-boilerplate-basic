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

    for (const line of markdown.split('\n')) {
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

// Known limits (fine for demo policies, revisit for real uploads): the overlap may
// start mid-word, and a single paragraph over MAX_CHARS stays as one oversized chunk.
function splitLongSection({ headingPath, body }: { headingPath: string; body: string }) {
    if (body.length <= MAX_CHARS) return [{ headingPath, text: body }]

    const pieces: string[] = []
    let current = ''
    for (const paragraph of body.split(/\n\s*\n/)) {
        if (current && current.length + paragraph.length > MAX_CHARS) {
        pieces.push(current)
        current = current.slice(-OVERLAP_CHARS)
        }
        current = current ? `${current}\n\n${paragraph}` : paragraph
    }
    if (current) pieces.push(current)
    return pieces.map((text) => ({ headingPath, text }))
}