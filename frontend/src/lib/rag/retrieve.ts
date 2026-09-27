import { z } from 'zod'
import { RAG_DISTANCE_THRESHOLD } from './config'
import { embedText } from './embed'
import type { RagDeps } from './types'

// DB rows are validated like user input: a malformed doc (manual console edit,
// schema drift) is skipped instead of crashing the chat. Zod also strips unknown
// fields, so the embedding vector never travels past this file.
const chunkSchema = z.object({
    policyId: z.string(),
    policyTitle: z.string(),
    chunkIndex: z.number(),
    headingPath: z.string(),
    text: z.string(),
})
export type RetrievedChunk = z.infer<typeof chunkSchema> & { id: string; distance?: number }

export async function searchPolicies(deps: RagDeps, query: string, limit = 4): Promise<RetrievedChunk[]> {
    const queryVector = await embedText(deps.ai, query, 'RETRIEVAL_QUERY')
    const snapshot = await deps.db
        .collection('hrKnowledge')
        .findNearest({
        vectorField: 'embedding',
        queryVector,
        limit,
        distanceMeasure: 'COSINE',
        distanceResultField: 'distance',
        // Farther than this means "not about this question". An empty result is our
        // cheap, deterministic FALLBACK signal: no LLM call needed to know we have nothing.
        distanceThreshold: RAG_DISTANCE_THRESHOLD,
        })
        .get()

    return snapshot.docs.flatMap((doc) => {
        const parsed = chunkSchema.safeParse(doc.data())
        return parsed.success ? [{ ...parsed.data, id: doc.id, distance: doc.get('distance') as number }] : []
    })
}

const MAX_FULL_POLICY_CHARS = 12_000

// Hierarchical RAG: search small (chunks) for precision, then return big (the whole
// policy) when the answer may depend on nearby clauses: exceptions, conditions, or
// the next step in a process. Returns null when the policy is too long to send.
export async function readPolicyDocument(deps: RagDeps, policyId: string): Promise<RetrievedChunk[] | null> {
    const snapshot = await deps.db
        .collection('hrKnowledge')
        .where('policyId', '==', policyId)
        .select('policyId', 'policyTitle', 'chunkIndex', 'headingPath', 'text') // skip embeddings
        .get()

    const chunks = snapshot.docs
        .flatMap((doc) => {
        const parsed = chunkSchema.safeParse(doc.data())
        return parsed.success ? [{ ...parsed.data, id: doc.id }] : []
        })
        // Sorted here rather than with .orderBy('chunkIndex'): equality + orderBy on another
        // field would need an extra composite index, and a policy has only a few dozen chunks.
        .sort((a, b) => a.chunkIndex - b.chunkIndex)

    const totalChars = chunks.reduce((sum, chunk) => sum + chunk.text.length, 0)
    return totalChars <= MAX_FULL_POLICY_CHARS ? chunks : null
}