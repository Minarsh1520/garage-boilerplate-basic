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

// How a publish may treat a policy that already exists:
//   new      a new policy: stop if one with the same id exists, so the admin can confirm
//   replace  the admin confirmed (or the seed script): overwrite whatever is there
//   edit     an edit of version `expectedVersion`: stop if anyone published since
export type PublishMode = 'new' | 'replace' | 'edit'

export type PublishResult =
    | { policyId: string; status: 'ready'; chunkCount: number }
    | { policyId: string; status: 'failed' }
    | { policyId: string; status: 'exists'; existingTitle: string; existingUpdatedAt?: string }
    | { policyId: string; status: 'conflict' }

// After this long, a policy still "processing" is treated as failed: the server stopped
// half way (a crash, a timeout) and nothing will ever finish it.
export const STUCK_AFTER_MS = 5 * 60 * 1000

// Publishing = claim the policy, then chunk + embed it into hrKnowledge.
//  1. The claim is ONE transaction: it checks the mode's rule and marks the row
//     `processing` with a new `version` number. Two admins can't both claim the same
//     policy: the second sees the first's change and gets "exists" or "conflict".
//  2. The old chunks stay live until the new ones are committed in one batch
//     (ingestPolicy), so employees never get a half-published policy.
export async function publishPolicy(
    deps: RagDeps,
    input: {
        form: PolicyForm
        source: 'file' | 'form' | 'seed'
        fileName?: string
        uid: string
        policyId?: string // an existing policy's id (edit, seed); new policies get one from the title
        mode?: PublishMode // default 'replace'
        expectedVersion?: number // edit only: the version the admin opened
    },
    ingest: typeof ingestPolicy = ingestPolicy
): Promise<PublishResult> {
    // A NEW policy's id comes from its title. An EDITED policy keeps the id it already has,
    // so changing its title updates it rather than creating a second copy.
    const policyId = input.policyId ?? slugify(input.form.title)
    if (!policyId) throw new Error('The policy title has no letters or numbers to make an id from')
    const ref = deps.db.collection(POLICY_COLLECTION).doc(policyId)
    const mode = input.mode ?? 'replace'

    const claim = await deps.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        const existing = snap.data()
        const version = typeof existing?.version === 'number' ? existing.version : 0
        if (mode === 'new' && snap.exists) {
            return {
                status: 'exists' as const,
                existingTitle: String(existing?.title ?? existing?.fileName ?? policyId),
                existingUpdatedAt: existing?.updatedAt?.toDate ? existing.updatedAt.toDate().toISOString() : undefined,
            }
        }
        if (mode === 'edit' && (!snap.exists || version !== (input.expectedVersion ?? 0))) return { status: 'conflict' as const }
        tx.set(
            ref,
            {
                policyId,
                title: input.form.title,
                form: input.form, // kept so the policy can be opened and edited again later
                source: input.source,
                ...(input.fileName ? { fileName: input.fileName } : {}),
                status: 'processing',
                version: version + 1,
                updatedBy: input.uid,
                updatedAt: FieldValue.serverTimestamp(),
                _schemaVersion: 2, // v1 was Nihal's upload-only row (fileData, no status)
            },
            { merge: true }
        )
        return { status: 'claimed' as const }
    })
    if (claim.status !== 'claimed') return { policyId, ...claim }

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
export async function listPolicies(deps: Pick<RagDeps, 'db'>, now: () => number = Date.now): Promise<PolicyListItem[]> {
    const snapshot = await deps.db
        .collection(POLICY_COLLECTION)
        .select('policyId', 'title', 'source', 'status', 'chunkCount', 'fileName', 'updatedAt', 'uploadedAt')
        .get()
    return snapshot.docs
        .map((doc) => {
            const d = doc.data()
            const when = d.updatedAt ?? d.uploadedAt
            let status: PolicyListItem['status'] = ['processing', 'ready', 'failed'].includes(d.status) ? d.status : 'not-published'
            // Still "processing" long after it started: the publish died half way. Shown as
            // failed, so the admin knows to publish it again instead of waiting forever.
            const startedAt = when?.toMillis ? when.toMillis() : undefined
            if (status === 'processing' && startedAt !== undefined && now() - startedAt > STUCK_AFTER_MS) status = 'failed'
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

// The saved form and its version, for "Edit". null for old upload-only rows.
export async function readPolicyForm(deps: Pick<RagDeps, 'db'>, policyId: string): Promise<{ form: PolicyForm; version: number } | null> {
    const snap = await deps.db.collection(POLICY_COLLECTION).doc(policyId).get()
    const form = snap.exists ? (snap.get('form') as PolicyForm | undefined) : undefined
    if (!form) return null
    const version = snap.get('version')
    return { form, version: typeof version === 'number' ? version : 0 }
}
