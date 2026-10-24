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
// A call that takes longer than this counts as "busy" and the next pair is tried.
// Without it, an overloaded Gemini can take minutes just to say no.
export const CALL_TIMEOUT_MS = 10_000

const COOLDOWN_MS = { usedUp: 60_000, busy: 15_000, timedOut: 15_000, badKey: 10 * 60_000, badModel: 10 * 60_000 } as const
type RefusalKind = keyof typeof COOLDOWN_MS

// Which refusals are about THIS key or model, and so worth trying the next pair for.
// Anything else (a malformed request) fails the same way on every key, so it is thrown
// at once. Gemini reports a mistyped key as a 400 that mentions "API key", which is how
// it is told apart from other 400s.
function refusalKind(error: unknown): RefusalKind | null {
    // The time limit aborts the request; fetch reports that as an AbortError.
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) return 'timedOut'
    if (!(error instanceof ApiError)) return null
    if (error.status === 429) return 'usedUp'
    if (error.status === 503) return 'busy'
    if (error.status === 401 || error.status === 403) return 'badKey'
    if (error.status === 400 && /api key/i.test(error.message)) return 'badKey'
    // 404: Gemini doesn't know this model name (a typo or a retired model). Skipped on
    // every key, so one wrong name in GEMINI_FALLBACK_MODELS can't stop every answer.
    if (error.status === 404) return 'badModel'
    return null
}

const refusalText = (kind: RefusalKind, error: unknown) =>
    kind === 'timedOut' ? `no reply within ${CALL_TIMEOUT_MS / 1000}s` : `${kind} (${(error as ApiError).status})`

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
    const makeClient = options.makeClient ?? ((apiKey: string) => new GoogleGenAI({ apiKey, httpOptions: { timeout: CALL_TIMEOUT_MS } }))
    const now = options.now ?? Date.now
    const clients = keys.map(makeClient)

    // "key index|model" → when the pair may be tried again, and why it was refused. Lives
    // as long as this server instance; a restart starts with every pair available.
    const cooling = new Map<string, { until: number; kind: RefusalKind; error: unknown }>()

    // Tries each (key, model) pair in order until one answers. Only refusals about the
    // key or model move on to the next pair (see refusalKind).
    async function tryPairs<T>(
        pairs: { keyIndex: number; model: string }[],
        call: (client: GenAI, model: string) => Promise<T>
    ): Promise<T> {
        // Why each pair was passed over this time: just refused, or still cooling down.
        const reasons: { kind: RefusalKind; error: unknown }[] = []
        for (const { keyIndex, model } of pairs) {
            const id = `${keyIndex}|${model}`
            const cooled = cooling.get(id)
            if (cooled && cooled.until > now()) {
                reasons.push(cooled)
                continue
            }
            try {
                const result = await call(clients[keyIndex]!, model)
                if (reasons.length > 0) console.info(`[gemini] answered by key ${keyIndex + 1}, model ${model}`)
                return result
            } catch (error) {
                const kind = refusalKind(error)
                if (!kind) throw error
                // The key number is logged, never the key itself.
                if (kind === 'badModel') {
                    console.warn(`[gemini] model "${model}" does not exist (404): check GEMINI_MODEL and GEMINI_FALLBACK_MODELS. Skipping it`)
                } else {
                    console.warn(`[gemini] key ${keyIndex + 1}, model ${model}: ${refusalText(kind, error)}, trying the next one`)
                }
                // A bad key is skipped for every model; an unknown model for every key.
                const ids =
                    kind === 'badKey' ? models.concat(model).map((m) => `${keyIndex}|${m}`)
                    : kind === 'badModel' ? keys.map((_, k) => `${k}|${model}`)
                    : [id]
                for (const each of ids) cooling.set(each, { until: now() + COOLDOWN_MS[kind], kind, error })
                reasons.push({ kind, error })
            }
        }
        throw poolExhausted(reasons)
    }

    // Every pair was refused or is cooling down. What the employee is told depends on why:
    //   something busy or too slow  → 503, "busy, try again in a moment" (it clears in seconds)
    //   allowance used up           → 429, "usage limit reached", no "Try again" button
    //   only bad keys / bad models  → that error itself, so the log shows the real cause
    function poolExhausted(reasons: { kind: RefusalKind; error: unknown }[]): ApiError {
        const kinds = new Set(reasons.map((r) => r.kind))
        if (kinds.has('busy') || kinds.has('timedOut')) {
            return new ApiError({ status: 503, message: 'Every Gemini key and model is busy or too slow right now' })
        }
        if (kinds.has('usedUp')) return new ApiError({ status: 429, message: 'All Gemini keys and models are out of quota' })
        const last = reasons[reasons.length - 1]?.error
        if (last instanceof ApiError) return last
        return new ApiError({ status: 429, message: 'No Gemini key or model is available' })
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
//   GEMINI_API_KEY           one key, or several separated by commas (tried in that order)
//   GEMINI_FALLBACK_MODELS   comma-separated generation models tried after GEMINI_MODEL
export function createGeminiPoolFromEnv(): GenAI {
    // GEMINI_API_KEYS was an earlier name, now replaced by GEMINI_API_KEY. Warn instead
    // of quietly using it, so there's only ever one place to look.
    if (process.env.GEMINI_API_KEYS) {
        console.warn('[gemini] GEMINI_API_KEYS is no longer read: put all keys in GEMINI_API_KEY, separated by commas')
    }
    return createGeminiPool({
        keys: list(process.env.GEMINI_API_KEY),
        models: list(process.env.GEMINI_FALLBACK_MODELS),
    })
}
