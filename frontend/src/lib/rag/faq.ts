import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { FAQ_DISTANCE_THRESHOLD } from './config'
import { embedText } from './embed'
import type { RagDeps } from './types'

// Stored answers to common questions, written by HR on the Admin FAQ page.
// A stored answer is checked BEFORE the AI: a hit costs no model call and always says
// the same approved words. Anything without a close match still goes to the AI.
export const FAQ_COLLECTION = 'faqAnswers'

// What an admin may type. Shared by the server action and the page, so they agree.
export const faqInputSchema = z.object({
    question: z.string().trim().min(5, 'Please write the question.').max(300),
    answer: z.string().trim().min(1, 'Please write the answer.').max(2000),
    // Optional: shown as the source under the answer, like a policy answer.
    // Zod 4: .optional() goes last so the key stays optional after the transform.
    policyTitle: z.string().trim().max(120).transform((v) => v || undefined).optional(),
})
export type FaqInput = z.infer<typeof faqInputSchema>

// DB rows are validated like user input, same as retrieve.ts.
const faqRowSchema = z.object({
    question: z.string(),
    answer: z.string(),
    policyTitle: z.string().optional(),
    active: z.boolean(),
})
export type FaqMatch = z.infer<typeof faqRowSchema> & { id: string; distance: number }

// The stored question is embedded as a QUERY, the same way an employee's question is.
// Question-to-question matching needs both sides embedded the same way, and it lets one
// embedding of the employee's question serve both the FAQ search and the policy search.
export function embedFaqQuestion(deps: Pick<RagDeps, 'ai'>, question: string) {
    return embedText(deps.ai, question, 'RETRIEVAL_QUERY')
}

// Returns the closest ACTIVE stored answer within the strict threshold, or null.
// `active` is filtered here, in code, rather than with .where(): a where() next to a
// vector search needs an extra composite index. Asking for 3 leaves room for one or two
// switched-off entries to be skipped.
export async function matchFaq(deps: Pick<RagDeps, 'db'>, queryVector: number[]): Promise<FaqMatch | null> {
    const snapshot = await deps.db
        .collection(FAQ_COLLECTION)
        .findNearest({
            vectorField: 'embedding',
            queryVector,
            limit: 3,
            distanceMeasure: 'COSINE',
            distanceResultField: 'distance',
            distanceThreshold: FAQ_DISTANCE_THRESHOLD,
        })
        .get()

    for (const doc of snapshot.docs) {
        const parsed = faqRowSchema.safeParse(doc.data())
        if (parsed.success && parsed.data.active) {
            return { ...parsed.data, id: doc.id, distance: doc.get('distance') as number }
        }
    }
    return null
}

export interface FaqListItem {
    id: string
    question: string
    answer: string
    policyTitle?: string
    active: boolean
    updatedAt?: string
}

// For the Admin FAQ page. select() leaves the 768 numbers of each embedding behind.
export async function listFaqs(deps: Pick<RagDeps, 'db'>): Promise<FaqListItem[]> {
    const snapshot = await deps.db
        .collection(FAQ_COLLECTION)
        .select('question', 'answer', 'policyTitle', 'active', 'updatedAt')
        .get()
    return snapshot.docs
        .map((doc) => {
            const data = doc.data()
            return {
                id: doc.id,
                question: String(data.question ?? ''),
                answer: String(data.answer ?? ''),
                policyTitle: typeof data.policyTitle === 'string' ? data.policyTitle : undefined,
                active: data.active === true,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined,
            }
        })
        .sort((a, b) => a.question.localeCompare(b.question))
}

// Create (no id) or edit (id). The question is re-embedded on every save, so an edited
// question is matched by its new wording straight away.
export async function saveFaq(
    deps: RagDeps,
    input: FaqInput & { id?: string; active?: boolean; savedBy: string }
): Promise<string> {
    const embedding = await embedFaqQuestion(deps, input.question)
    const collection = deps.db.collection(FAQ_COLLECTION)
    const ref = input.id ? collection.doc(input.id) : collection.doc()
    const isNew = !input.id

    await ref.set(
        {
            question: input.question,
            answer: input.answer,
            policyTitle: input.policyTitle ?? FieldValue.delete(),
            embedding: FieldValue.vector(embedding),
            updatedBy: input.savedBy,
            updatedAt: FieldValue.serverTimestamp(),
            ...(isNew ? { active: input.active ?? true, createdBy: input.savedBy, createdAt: FieldValue.serverTimestamp() } : {}),
            _schemaVersion: 1,
        },
        { merge: true }
    )
    return ref.id
}

// Switching an answer off keeps it on the page but stops the chatbot using it.
export async function setFaqActive(deps: Pick<RagDeps, 'db'>, id: string, active: boolean) {
    await deps.db.collection(FAQ_COLLECTION).doc(id).update({ active, updatedAt: FieldValue.serverTimestamp() })
}

export async function deleteFaq(deps: Pick<RagDeps, 'db'>, id: string) {
    await deps.db.collection(FAQ_COLLECTION).doc(id).delete()
}
