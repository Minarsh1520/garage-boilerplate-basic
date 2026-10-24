import { ApiError } from '@google/genai'

// A 503 (model overloaded) usually clears within seconds, so wait briefly and try
// again. A 429 (allowance used up) is NOT retried: the pool has already tried every
// key and model, and another attempt would only use more of an empty allowance.
// Any other error is a real bug: fail straight away so it isn't hidden.

export async function withRetry<T>(call: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await call()
    } catch (error) {
      const retryable = error instanceof ApiError && error.status === 503
      if (!retryable || i >= attempts) throw error
      // 1s, then 2s, plus a little random jitter so retries don't all land at once.
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (i - 1) + Math.random() * 300))
    }
  }
}