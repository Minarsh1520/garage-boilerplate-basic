import 'server-only'
import { GoogleGenAI } from '@google/genai'
import { adminDb } from '@/lib/firebase/admin'
import type { RagDeps } from './types'

// The only lib/rag file tied to the Next.js runtime. Everything else takes deps as a
// parameter so the seed script and tests can reuse it without importing server-only.
export function getRagDeps(): RagDeps {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY missing') // caught upstream, never shown to users
    return { ai: new GoogleGenAI({ apiKey }), db: adminDb }
}