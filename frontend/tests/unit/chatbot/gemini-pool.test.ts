import { describe, it, expect, vi } from 'vitest'
import { ApiError } from '@google/genai'
import { createGeminiPool, type GenAI } from '@/lib/rag/gemini-pool'

// A fake client per key. `behaviour(model)` decides what that key does for that model.
function fakeKeys(behaviour: Record<string, (model: string) => 'ok' | 429 | 503 | 400 | 404 | 'badKey' | 'timeout'>) {
    const calls: string[] = []
    const makeClient = (key: string): GenAI => ({
        models: {
            generateContent: vi.fn(async ({ model }) => {
                calls.push(`${key}:${model}`)
                const outcome = behaviour[key]!(model)
                if (outcome === 'ok') return { text: `${key}:${model}` } as never
                if (outcome === 'badKey') throw new ApiError({ status: 400, message: 'API key not valid. Please pass a valid API key.' })
                if (outcome === 'timeout') throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })
                throw new ApiError({ status: outcome, message: String(outcome) })
            }),
            embedContent: vi.fn(async ({ model }) => {
                calls.push(`${key}:${model}`)
                const outcome = behaviour[key]!(model)
                if (outcome === 'ok') return { embeddings: [{ values: [1] }] } as never
                if (outcome === 'badKey') throw new ApiError({ status: 400, message: 'API key not valid' })
                if (outcome === 'timeout') throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })
                throw new ApiError({ status: outcome, message: String(outcome) })
            }),
        },
    })
    return { calls, makeClient }
}

const ask = (pool: GenAI) => pool.models.generateContent({ model: 'main', contents: 'q' })
const quiet = () => { vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'info').mockImplementation(() => {}) }

describe('createGeminiPool', () => {
    it('uses key 1 with the main model when it works', async () => {
        const { calls, makeClient } = fakeKeys({ k1: () => 'ok', k2: () => 'ok' })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: ['backup'], makeClient })
        expect((await ask(pool)).text).toBe('k1:main')
        expect(calls).toEqual(['k1:main'])
    })

    it('tries the main model on every key before dropping to the fallback model', async () => {
        quiet()
        // Both keys have used up the main model; both still have the backup model.
        const mainUsedUp = (m: string) => (m === 'main' ? 429 : 'ok')
        const { calls, makeClient } = fakeKeys({ k1: mainUsedUp, k2: mainUsedUp })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: ['backup'], makeClient })
        expect((await ask(pool)).text).toBe('k1:backup')
        expect(calls).toEqual(['k1:main', 'k2:main', 'k1:backup'])
    })

    it('moves on from a busy key (503) as well as a used-up one (429)', async () => {
        quiet()
        const { makeClient } = fakeKeys({ k1: () => 503, k2: () => 'ok' })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: [], makeClient })
        expect((await ask(pool)).text).toBe('k2:main')
    })

    it('stops at once on any other error, without trying the rest of the pool', async () => {
        const { calls, makeClient } = fakeKeys({ k1: () => 400, k2: () => 'ok' })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: ['backup'], makeClient })
        await expect(ask(pool)).rejects.toMatchObject({ status: 400 })
        expect(calls).toEqual(['k1:main'])
    })

    it('skips a mistyped or revoked key and uses the next one', async () => {
        quiet()
        const { calls, makeClient } = fakeKeys({ k1: () => 'badKey', k2: () => 'ok' })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: ['backup'], makeClient })
        expect((await ask(pool)).text).toBe('k2:main')
        await ask(pool)
        // k1 is not tried again on the next question, for any model.
        expect(calls).toEqual(['k1:main', 'k2:main', 'k2:main'])
    })

    it('skips a used-up key until its cooldown ends', async () => {
        quiet()
        let t = 0
        const { calls, makeClient } = fakeKeys({ k1: () => (t < 60_000 ? 429 : 'ok'), k2: () => 'ok' })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: [], makeClient, now: () => t })
        await ask(pool)                 // k1 refuses, k2 answers
        await ask(pool)                 // k1 is cooling down: straight to k2
        expect(calls).toEqual(['k1:main', 'k2:main', 'k2:main'])
        t = 61_000
        expect((await ask(pool)).text).toBe('k1:main')  // cooldown over: k1 is tried again
    })

    it('reports a 429 when every key and model is used up', async () => {
        quiet()
        const { makeClient } = fakeKeys({ k1: () => 429, k2: () => 429 })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: ['backup'], makeClient })
        await expect(ask(pool)).rejects.toMatchObject({ status: 429 })
    })

    it('never changes the embedding model, only the key', async () => {
        quiet()
        const { calls, makeClient } = fakeKeys({ k1: () => 429, k2: () => 'ok' })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: ['backup'], makeClient })
        await pool.models.embedContent({ model: 'embed-1', contents: 'q' })
        expect(calls).toEqual(['k1:embed-1', 'k2:embed-1'])
    })

    it('ignores blank and repeated keys, and refuses an empty list', () => {
        const { makeClient } = fakeKeys({})
        expect(() => createGeminiPool({ keys: [' ', ''], models: [], makeClient })).toThrow('No Gemini API key')
        const made = vi.fn(makeClient)
        createGeminiPool({ keys: ['k1', ' k1 ', ''], models: [], makeClient: made })
        expect(made).toHaveBeenCalledTimes(1)
    })

    it('skips a model name Gemini does not know (404) and uses the next model', async () => {
        quiet()
        // The main model is busy on both keys; the first fallback is a typo; the second works.
        const { calls, makeClient } = fakeKeys({
            k1: (m) => (m === 'main' ? 503 : m === 'typo-model' ? 404 : 'ok'),
            k2: (m) => (m === 'main' ? 503 : m === 'typo-model' ? 404 : 'ok'),
        })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: ['typo-model', 'backup'], makeClient })
        expect((await ask(pool)).text).toBe('k1:backup')
        // The unknown model is tried once, then skipped for key 2 as well.
        expect(calls).toEqual(['k1:main', 'k2:main', 'k1:typo-model', 'k1:backup'])
    })

    it('reports the 404 itself when no configured model exists', async () => {
        quiet()
        const { makeClient } = fakeKeys({ k1: () => 404, k2: () => 404 })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: [], makeClient })
        await expect(ask(pool)).rejects.toMatchObject({ status: 404 })
    })

    it('treats a call that runs out of time as busy and tries the next key', async () => {
        quiet()
        const { calls, makeClient } = fakeKeys({ k1: () => 'timeout', k2: () => 'ok' })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: [], makeClient })
        expect((await ask(pool)).text).toBe('k2:main')
        expect(calls).toEqual(['k1:main', 'k2:main'])
    })

    it('reports "busy" (503), not "usage limit", while something will clear in seconds', async () => {
        quiet()
        // Key 1 is slow, key 2 has used up its allowance: key 1 will be back soon.
        const { makeClient } = fakeKeys({ k1: () => 'timeout', k2: () => 429 })
        const pool = createGeminiPool({ keys: ['k1', 'k2'], models: [], makeClient })
        await expect(ask(pool)).rejects.toMatchObject({ status: 503 })
        // Asked again straight away, every pair is still cooling down: still "busy".
        await expect(ask(pool)).rejects.toMatchObject({ status: 503 })
    })
})
