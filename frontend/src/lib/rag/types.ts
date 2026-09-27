import type { GoogleGenAI } from '@google/genai'
import type { Firestore } from 'firebase-admin/firestore'

// Everything the RAG code needs from the outside world, passed in rather than
// imported, so the same functions run in Next.js, the seed script, and tests.
export interface RagDeps {
    ai: GoogleGenAI
    db: Firestore
}