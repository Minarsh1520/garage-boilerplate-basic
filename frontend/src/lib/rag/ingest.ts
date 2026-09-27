// This version is safe from the limit of free tier
import { FieldValue } from 'firebase-admin/firestore'
import { chunkMarkdown } from './chunker'
import { embedText } from './embed'
import type { RagDeps } from './types'

export async function ingestPolicy(
  deps: RagDeps,
  input: { policyId: string; policyTitle: string; markdown: string }
) {
  const chunks = chunkMarkdown(input.markdown)
  if (chunks.length === 0) throw new Error('Policy has no content to ingest')

  const collection = deps.db.collection('hrKnowledge')
  const batch = deps.db.batch()
  const newIds = new Set<string>()

  // Sequential on purpose: firing every embedding call at once would trip rate
  // limits. Ingestion isn't user-facing, so slow is fine.
  for (const chunk of chunks) {
    // Basic version: embed the chunk on its own. Contextual retrieval (an LLM-written
    // context line per chunk) comes later. The empty field keeps the data shape the
    // same, so adding it is a re-seed, not a schema change.
    const context = ''
    const embedding = await embedText(deps.ai, chunk.text, 'RETRIEVAL_DOCUMENT')

    // Deterministic ID: re-seeding overwrites a policy's chunks instead of duplicating them.
    const id = `${input.policyId}_${chunk.chunkIndex}`
    newIds.add(id)
    batch.set(collection.doc(id), {
      policyId: input.policyId,
      policyTitle: input.policyTitle,
      chunkIndex: chunk.chunkIndex,
      headingPath: chunk.headingPath,
      context,
      text: chunk.text,
      embedding: FieldValue.vector(embedding),
      createdAt: FieldValue.serverTimestamp(),
      _schemaVersion: 1,
    })
  }

  // If the new version is shorter, delete leftover chunks so outdated text can't be retrieved.
  const existing = await collection.where('policyId', '==', input.policyId).select().get()
  existing.docs.filter((doc) => !newIds.has(doc.id)).forEach((doc) => batch.delete(doc.ref))

  // One atomic commit: employees see the old policy or the new one, never a mix.
  await batch.commit()
  return { chunkCount: chunks.length }
}