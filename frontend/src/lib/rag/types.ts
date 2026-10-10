import type { GenAI } from './gemini-pool'
 import type { Firestore } from 'firebase-admin/firestore'


// Everything the RAG code needs from the outside world, passed in rather than
// imported, so the same functions run in Next.js, the seed script, and tests.
export interface RagDeps {
    ai: GenAI
    db: Firestore
}