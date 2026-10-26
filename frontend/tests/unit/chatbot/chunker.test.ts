import { describe, it, expect } from 'vitest'
import { chunkMarkdown, splitOversized } from '@/lib/rag/chunker'

describe('chunkMarkdown', () => {
    it('drops HTML comments so maintainer notes are never ingested', () => {
        const chunks = chunkMarkdown('# Leave Policy\n<!-- Placeholder file -->\n\n## Requesting leave\nUse the portal.')
        expect(chunks).toEqual([{ chunkIndex: 0, headingPath: 'Leave Policy > Requesting leave', text: 'Use the portal.' }])
    })

    // Git on Windows can convert a file to \r\n on checkout without anyone editing it.
    it('finds the same headings in a file with Windows line endings', () => {
        const unix = '# Leave Policy\n\n## Requesting leave\nUse the portal.\n\n## Approval process\nYour manager approves.'
        expect(chunkMarkdown(unix.replace(/\n/g, '\r\n'))).toEqual(chunkMarkdown(unix))
        expect(chunkMarkdown(unix)).toHaveLength(2)
    })
})

describe('long paragraphs', () => {
    const sentence = 'Staff must request planned leave at least two weeks ahead in the portal. '

    it('splits one very long paragraph at sentence ends, so no chunk is too big to embed', () => {
        const paragraph = sentence.repeat(100).trim() // about 7,300 characters, no blank lines
        const chunks = chunkMarkdown(`# Leave Policy\n\n## Requesting leave\n${paragraph}`)
        expect(chunks.length).toBeGreaterThan(3)
        for (const chunk of chunks) {
            expect(chunk.text.length).toBeLessThanOrEqual(2000 + 2 + 200) // a piece, plus the overlap carried over
            expect(chunk.headingPath).toBe('Leave Policy > Requesting leave')
        }
        // Every piece but the overlap starts at a sentence: nothing is cut mid-word.
        expect(splitOversized(paragraph).every((piece) => piece.endsWith('.'))).toBe(true)
    })

    it('falls back to spaces, then to a hard cut, when there are no sentences', () => {
        expect(splitOversized('word '.repeat(1000)).every((piece) => piece.length <= 2000)).toBe(true)
        expect(splitOversized('x'.repeat(4500)).map((piece) => piece.length)).toEqual([2000, 2000, 500])
    })

    it('leaves short text alone', () => {
        expect(splitOversized('Short.')).toEqual(['Short.'])
    })
})

