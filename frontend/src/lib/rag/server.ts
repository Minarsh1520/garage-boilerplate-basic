import 'server-only'
import { adminDb } from '@/lib/firebase/admin'
import { createGeminiPoolFromEnv, type GenAI } from './gemini-pool'
import type { RagDeps } from './types'

// One pool per server instance, not one per request: the pool remembers which keys
// are used up, and a fresh pool every request would forget and try them all again.
let pool: GenAI | undefined

// The only lib/rag file tied to the Next.js runtime. Everything else takes deps as a
// parameter so the seed script and tests can reuse it without importing server-only.
export function getRagDeps(): RagDeps {
    pool ??= createGeminiPoolFromEnv() // throws if no key is set: caught upstream as APP-CONFIG
    return { ai: pool, db: adminDb }
}
