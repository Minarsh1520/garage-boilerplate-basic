import { describe, it, expect, vi } from 'vitest'
import type { RagDeps } from '@/lib/rag/types'
import { publishPolicy } from '@/lib/rag/publish'

const FORM = { title: 'Leave Policy', sections: [{ heading: 'Requesting leave', body: 'Use My Leave.' }] }

function fakeDb() {
    const writes: { id: string; op: string; data: Record<string, unknown> }[] = []
    const db = {
        collection: () => ({
            doc: (id: string) => ({
                set: async (data: Record<string, unknown>) => void writes.push({ id, op: 'set', data }),
                update: async (data: Record<string, unknown>) => void writes.push({ id, op: 'update', data }),
            }),
        }),
    }
    return { deps: { db, ai: {} } as unknown as RagDeps, writes }
}

describe('publishPolicy', () => {
    it('marks the policy processing, sends the form to ingestion, then marks it ready', async () => {
        const { deps, writes } = fakeDb()
        const ingest = vi.fn(async () => ({ chunkCount: 1 }))
        expect(await publishPolicy(deps, { form: FORM, source: 'file', uid: 'admin1' }, ingest)).toEqual({ policyId: 'leave-policy', status: 'ready', chunkCount: 1 })
        expect(writes.map((w) => [w.id, w.op, w.data.status])).toEqual([['leave-policy', 'set', 'processing'], ['leave-policy', 'update', 'ready']])
        expect(ingest).toHaveBeenCalledWith(deps, expect.objectContaining({ policyId: 'leave-policy', policyTitle: 'Leave Policy', markdown: expect.stringContaining('## Requesting leave') }))
    })

    it('marks the policy failed, without throwing, when ingestion fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const { deps, writes } = fakeDb()
        const result = await publishPolicy(deps, { form: FORM, source: 'form', uid: 'admin1' }, async () => { throw new Error('quota') })
        expect(result.status).toBe('failed')
        expect(writes.at(-1)?.data.status).toBe('failed')
    })

    it('keeps the existing id when editing, even if the title changed', async () => {
        const { deps } = fakeDb()
        const result = await publishPolicy(deps, { form: { ...FORM, title: 'Leave and Holidays' }, source: 'form', uid: 'a', policyId: 'leave-policy' }, async () => ({ chunkCount: 1 }))
        expect(result.policyId).toBe('leave-policy')
    })
})
