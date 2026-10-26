import { describe, it, expect, vi } from 'vitest'
import type { RagDeps } from '@/lib/rag/types'
import { listPolicies, publishPolicy, STUCK_AFTER_MS } from '@/lib/rag/publish'

const FORM = { title: 'Leave Policy', sections: [{ heading: 'Requesting leave', body: 'Use My Leave.' }] }

// A fake Firestore with ONE stored policy row (or none). The transaction reads that row,
// so the tests can set up "already exists" and "someone published since".
function fakeDb(existing?: Record<string, unknown>) {
    const writes: { id: string; op: string; data: Record<string, unknown> }[] = []
    const row = existing ? { ...existing } : undefined
    const docRef = (id: string) => ({
        id,
        set: async (data: Record<string, unknown>) => void writes.push({ id, op: 'set', data }),
        update: async (data: Record<string, unknown>) => void writes.push({ id, op: 'update', data }),
    })
    const db = {
        collection: () => ({ doc: docRef }),
        runTransaction: async <T,>(work: (tx: unknown) => Promise<T>) =>
            work({
                get: async () => ({ exists: row !== undefined, data: () => row }),
                set: (ref: { id: string }, data: Record<string, unknown>) => void writes.push({ id: ref.id, op: 'set', data }),
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

    it('stops a NEW policy whose title is already in use, so the admin can confirm', async () => {
        const { deps, writes } = fakeDb({ title: 'Leave Policy', version: 3 })
        const ingest = vi.fn()
        const result = await publishPolicy(deps, { form: FORM, source: 'form', uid: 'a', mode: 'new' }, ingest)
        expect(result).toMatchObject({ status: 'exists', existingTitle: 'Leave Policy' })
        expect(writes).toEqual([])
        expect(ingest).not.toHaveBeenCalled()
    })

    it('replaces it once the admin confirms, and bumps the version', async () => {
        const { deps, writes } = fakeDb({ title: 'Leave Policy', version: 3 })
        await publishPolicy(deps, { form: FORM, source: 'form', uid: 'a', mode: 'replace' }, async () => ({ chunkCount: 1 }))
        expect(writes[0]?.data).toMatchObject({ status: 'processing', version: 4 })
    })

    it('stops an edit when someone else published since it was opened', async () => {
        const { deps, writes } = fakeDb({ title: 'Leave Policy', version: 4 })
        const result = await publishPolicy(deps, { form: FORM, source: 'form', uid: 'a', policyId: 'leave-policy', mode: 'edit', expectedVersion: 3 }, vi.fn())
        expect(result).toEqual({ policyId: 'leave-policy', status: 'conflict' })
        expect(writes).toEqual([])
    })

    it('lets an edit through when nothing changed, and refuses one for a policy that no longer exists', async () => {
        const same = fakeDb({ title: 'Leave Policy', version: 4 })
        expect((await publishPolicy(same.deps, { form: FORM, source: 'form', uid: 'a', policyId: 'leave-policy', mode: 'edit', expectedVersion: 4 }, async () => ({ chunkCount: 1 }))).status).toBe('ready')
        const gone = fakeDb()
        expect((await publishPolicy(gone.deps, { form: FORM, source: 'form', uid: 'a', policyId: 'leave-policy', mode: 'edit', expectedVersion: 4 }, vi.fn())).status).toBe('conflict')
    })
})

describe('listPolicies', () => {
    it('shows a policy stuck on "processing" for too long as failed', async () => {
        const now = 1_000_000_000_000
        const row = (status: string, ageMs: number) => ({
            id: status + ageMs,
            data: () => ({ title: 'P', status, updatedAt: { toMillis: () => now - ageMs, toDate: () => new Date(now - ageMs) } }),
        })
        const db = { collection: () => ({ select: () => ({ get: async () => ({ docs: [row('processing', 60_000), row('processing', STUCK_AFTER_MS + 1)] }) }) }) }
        const list = await listPolicies({ db } as unknown as Pick<RagDeps, 'db'>, () => now)
        expect(list.map((p) => p.status)).toEqual(['processing', 'failed'])
    })
})

