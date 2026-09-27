// Settings that MUST match between ingestion and retrieval. Changing EMBED_MODEL or
// EMBED_DIM means re-seeding every policy AND redeploying the vector index, because
// vectors from different models or sizes cannot be compared.
export const EMBED_MODEL = 'gemini-embedding-001'
export const EMBED_DIM = 768

export const GEN_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'

// Number('') is 0, so a blank env line would silently become 0. Here, anything
// missing, blank or non-numeric falls back to the default instead.
export function numberFromEnv(name: string, fallback: number): number {
    const raw = process.env[name]?.trim()
    const value = Number(raw)
    return raw && Number.isFinite(value) ? value : fallback
}

// Maximum cosine DISTANCE for a hit to count as relevant. Farther hits are treated
// as "no approved information", which leads to FALLBACK. UNVERIFIED: we assume
// distance = 1 - similarity (0 = identical). Log real distances on the BA test
// questions before trusting 0.38.
export const RAG_DISTANCE_THRESHOLD = numberFromEnv('RAG_DISTANCE_THRESHOLD', 0.38)