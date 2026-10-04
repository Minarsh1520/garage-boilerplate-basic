import { ApiError } from '@google/genai'

// A 503 (model overloaded) or 429 (rate limit) usually clears within seconds,
// so wait briefly and try again before giving up. Any other error is a real bug:
// fail straight away so it isn't hidden.
export async function withRetry<T>(call: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await call()
    } catch (error) {
      const retryable = error instanceof ApiError && (error.status === 503 || error.status === 429)
      if (!retryable || i >= attempts) throw error
      // 1s, then 2s, plus a little random jitter so retries don't all land at once.
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (i - 1) + Math.random() * 300))
    }
  }
}