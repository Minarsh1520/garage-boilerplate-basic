import type { GoogleGenAI } from '@google/genai'
import { EMBED_DIM, EMBED_MODEL } from './config'
import { withRetry } from './retry'
// taskType shapes the vector for its role: RETRIEVAL_DOCUMENT when storing policy
// text, RETRIEVAL_QUERY when embedding a question, so questions land near their
// answers. Mixing them up degrades match quality silently.
export async function embedText(
    ai: GoogleGenAI,
    text: string,
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
    ): Promise<number[]> {
    const result = await withRetry(() => ai.models.embedContent({
        model: EMBED_MODEL,
        contents: text,
        config: { taskType, outputDimensionality: EMBED_DIM },
    }), 2)
    const values = result.embeddings?.[0]?.values
    // Fail loudly on a wrong shape. The vector index would reject it anyway, but a
    // clear error here is much easier to debug.
    if (!values || values.length !== EMBED_DIM) throw new Error('Unexpected embedding shape')
    return l2Normalize(values)
}

// gemini-embedding-001 only returns unit-length vectors at the full 3072 dims.
// Shortened vectors must be rescaled to length 1, or cosine distances skew and the
// fallback threshold stops meaning the same thing for every chunk.
export function l2Normalize(vector: number[]): number[] {
    const norm = Math.hypot(...vector)
    if (norm === 0) throw new Error('Cannot normalise a zero vector')
    return vector.map((v) => v / norm)
}