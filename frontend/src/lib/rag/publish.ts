import { FieldValue } from 'firebase-admin/firestore'
import { ingestPolicy } from './ingest'
import { formToMarkdown, slugify, type PolicyForm } from './policy-sources'
import type { RagDeps } from './types'

// One row per policy, id = policyId. It tells the Admin page what is published and
// whether it worked. The chatbot itself only reads hrKnowledge (the chunks).
export const POLICY_COLLECTION = 'policyDocuments'

export type PolicyStatus = 'processing' | 'ready' | 'failed'

export interface PolicyListItem {
    policyId: string
    title: string
    source: string
    status: PolicyStatus | 'not-published'
    chunkCount?: number
    fileName?: string
    updatedAt?: string
}

// Publishing = save the form, then chunk + embed it into hrKnowledge. The row is marked
// `processing` first, so a crash half way leaves a visible "processing"/"failed" row
// rather than nothing. The old chunks stay live until the new ones are committed in one
// batch (ingestPolicy), so employees never get a half-published policy.
export async function publishPolicy(
    deps: RagDeps,
    input: { form: PolicyForm; source: 'file' | 'form' | 'seed'; fileName?: string; uid: string; policyId?: string },
    ingest: typeof ingestPolicy = ingestPolicy
): Promise<{ policyId: string; status: 'ready' | 'failed'; chunkCount?: number }> {
    // A NEW policy's id comes from its title. An EDITED policy keeps the id it already has,
    // so changing its title updates it rather than creating a second copy.
    const policyId = input.policyId ?? slugify(input.form.title)
    if (!policyId) throw new Error('The policy title has no letters or numbers to make an id from')
    const ref = deps.db.collection(POLICY_COLLECTION).doc(policyId)

    await ref.set(
        {
            policyId,
            title: input.form.title,
            form: input.form, // kept so the policy can be opened and edited again later
            source: input.source,
            ...(input.fileName ? { fileName: input.fileName } : {}),
            status: 'processing',
            updatedBy: input.uid,
            updatedAt: FieldValue.serverTimestamp(),
            _schemaVersion: 2, // v1 was Nihal's upload-only row (fileData, no status)
        },
        { merge: true }
    )

    try {
        const { chunkCount } = await ingest(deps, { policyId, policyTitle: input.form.title, markdown: formToMarkdown(input.form) })
        await ref.update({ status: 'ready', chunkCount, error: FieldValue.delete(), fileData: FieldValue.delete() })
        return { policyId, status: 'ready', chunkCount }
    } catch (error) {
        console.error(`[policy] publishing ${policyId} failed`, error)
        await ref.update({ status: 'failed', error: 'Publishing failed. Please try again.' })
        return { policyId, status: 'failed' }
    }
}

// Removes the policy from the chatbot (its chunks) and from the list (its row), in one batch.
export async function deletePolicy(deps: Pick<RagDeps, 'db'>, policyId: string) {
    const chunks = await deps.db.collection('hrKnowledge').where('policyId', '==', policyId).select().get()
    const batch = deps.db.batch()
    chunks.docs.forEach((doc) => batch.delete(doc.ref))
    batch.delete(deps.db.collection(POLICY_COLLECTION).doc(policyId))
    await batch.commit()
    return { deletedChunks: chunks.size }
}

// For the Admin page. select() skips the stored form and any old base64 file data.
// Rows from the old upload-only version (no status) are listed as "not published".
export async function listPolicies(deps: Pick<RagDeps, 'db'>): Promise<PolicyListItem[]> {
    const snapshot = await deps.db
        .collection(POLICY_COLLECTION)
        .select('policyId', 'title', 'source', 'status', 'chunkCount', 'fileName', 'updatedAt', 'uploadedAt')
        .get()
    return snapshot.docs
        .map((doc) => {
            const d = doc.data()
            const when = d.updatedAt ?? d.uploadedAt
            const status: PolicyListItem['status'] = ['processing', 'ready', 'failed'].includes(d.status) ? d.status : 'not-published'
            return {
                policyId: doc.id,
                title: String(d.title ?? d.fileName ?? doc.id),
                source: String(d.source ?? 'pdf'),
                status,
                chunkCount: typeof d.chunkCount === 'number' ? d.chunkCount : undefined,
                fileName: typeof d.fileName === 'string' ? d.fileName : undefined,
                updatedAt: when?.toDate ? when.toDate().toISOString() : undefined,
            }
        })
        .sort((a, b) => a.title.localeCompare(b.title))
}

// The saved form, for "Edit" on the Admin page. null for old upload-only rows.
export async function readPolicyForm(deps: Pick<RagDeps, 'db'>, policyId: string): Promise<PolicyForm | null> {
    const snap = await deps.db.collection(POLICY_COLLECTION).doc(policyId).get()
    const form = snap.exists ? (snap.get('form') as PolicyForm | undefined) : undefined
    return form ?? null
}
