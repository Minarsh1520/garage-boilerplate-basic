import { describe, it, expect } from 'vitest'
import { chunkMarkdown } from '@/lib/rag/chunker'

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