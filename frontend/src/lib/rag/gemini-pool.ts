import {
    ApiError,
    GoogleGenAI,
    type EmbedContentParameters,
    type EmbedContentResponse,
    type GenerateContentParameters,
    type GenerateContentResponse,
} from '@google/genai'

// The two calls the app makes. Everything else (the pipeline, the seed and probe
// scripts, the tests) talks to this shape, so it can't tell a pool from one client.
export interface GenAI {
    models: {
        generateContent(params: GenerateContentParameters): Promise<GenerateContentResponse>
        embedContent(params: EmbedContentParameters): Promise<EmbedContentResponse>
    }
}

// How long a key + model pair is skipped after Gemini refuses it. A 429 is a used-up
// allowance (the per-minute one clears within a minute); a 503 is Gemini being busy.
// A key problem (revoked, mistyped, not allowed) won't fix itself, so it waits longest.
const COOLDOWN_MS = { usedUp: 60_000, busy: 15_000, badKey: 10 * 60_000 } as const

// Which refusals are about THIS key or model, and so worth trying the next pair for.
// Anything else (a malformed request, a wrong model name) fails the same way on every
// key, so it is thrown at once. Gemini reports a mistyped key as a 400 that mentions
// "API key", which is how it is told apart from other 400s.
function refusalKind(error: unknown): keyof typeof COOLDOWN_MS | null {
    if (!(error instanceof ApiError)) return null
    if (error.status === 429) return 'usedUp'
    if (error.status === 503) return 'busy'
    if (error.status === 401 || error.status === 403) return 'badKey'
    if (error.status === 400 && /api key/i.test(error.message)) return 'badKey'
    return null
}

export interface PoolOptions {
    keys: string[]            // tried in order; key 1 first
    models: string[]          // generation models, best first; the first is tried on every key before the next
    makeClient?: (apiKey: string) => GenAI  // replaced in tests
    now?: () => number        // replaced in tests
}

// A pool of API keys with model fallback, shaped like one Gemini client.
//
// RISK, agreed with the team: keys from the SAME Google project share one allowance, so
// they add nothing. Keys from DIFFERENT projects do add capacity, but Google may treat
// pooling them as getting around its limits and restrict those projects. Keep the
// project that hosts the deployed demo out of this pool where possible.
export function createGeminiPool(options: PoolOptions): GenAI {
    const keys = [...new Set(options.keys.map((k) => k.trim()).filter(Boolean))]
    if (keys.length === 0) throw new Error('No Gemini API key configured')
    const models = [...new Set(options.models.map((m) => m.trim()).filter(Boolean))]
    const makeClient = options.makeClient ?? ((apiKey: string) => new GoogleGenAI({ apiKey }))
    const now = options.now ?? Date.now
    const clients = keys.map(makeClient)

    // "key index|model" → time the pair may be tried again. Lives as long as this
    // server instance; a restart simply starts with every pair available.
    const coolingUntil = new Map<string, number>()

    // Tries each (key, model) pair in order until one answers. Only refusals about the
    // key or model move on to the next pair (see refusalKind).
    async function tryPairs<T>(
        pairs: { keyIndex: number; model: string }[],
        call: (client: GenAI, model: string) => Promise<T>
    ): Promise<T> {
        let lastRefusal: ApiError | undefined
        for (const { keyIndex, model } of pairs) {
            const id = `${keyIndex}|${model}`
            if ((coolingUntil.get(id) ?? 0) > now()) continue
            try {
                const result = await call(clients[keyIndex]!, model)
                if (lastRefusal) console.info(`[gemini] answered by key ${keyIndex + 1}, model ${model}`)
                return result
            } catch (error) {
                const kind = refusalKind(error)
                if (!kind) throw error
                // The key number is logged, never the key itself.
                console.warn(`[gemini] key ${keyIndex + 1}, model ${model}: ${kind} (${(error as ApiError).status}), trying the next one`)
                // A bad key is skipped for every model, not just this one.
                const ids = kind === 'badKey' ? models.concat(model).map((m) => `${keyIndex}|${m}`) : [id]
                for (const each of ids) coolingUntil.set(each, now() + COOLDOWN_MS[kind])
                lastRefusal = error as ApiError
            }
        }
        // Every pair is cooling down or just refused. Reported as a 429, which the chat
        // shows as "usage limit reached" with no "Try again" button.
        throw new ApiError({ status: 429, message: `All Gemini keys and models are out of quota or busy${lastRefusal ? `: ${lastRefusal.message}` : ''}` })
    }

    return {
        models: {
            // The model asked for goes first, then the configured fallbacks. Best model on
            // every key before dropping to the next model, so quality drops only when it must.
            generateContent(params) {
                const order = [...new Set([params.model, ...models])]
                const pairs = order.flatMap((model) => keys.map((_, keyIndex) => ({ keyIndex, model })))
                return tryPairs(pairs, (client, model) => client.models.generateContent({ ...params, model }))
            },
            // Embeddings rotate KEYS only. The model never changes: vectors from a different
            // embedding model can't be compared with the stored policy vectors, so search
            // would quietly return nonsense.
            embedContent(params) {
                const pairs = keys.map((_, keyIndex) => ({ keyIndex, model: params.model }))
                return tryPairs(pairs, (client) => client.models.embedContent(params))
            },
        },
    }
}

// "a, b,,c" → ['a', 'b', 'c']
function list(value: string | undefined): string[] {
    return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}

// Reads the pool's settings from the environment. Works in Next.js and in the scripts.
//   GEMINI_API_KEYS          comma-separated keys; falls back to GEMINI_API_KEY
//   GEMINI_FALLBACK_MODELS   comma-separated generation models tried after GEMINI_MODEL
export function createGeminiPoolFromEnv(): GenAI {
    const keys = list(process.env.GEMINI_API_KEYS)
    if (keys.length === 0) keys.push(...list(process.env.GEMINI_API_KEY))
    return createGeminiPool({ keys, models: list(process.env.GEMINI_FALLBACK_MODELS) })
}
