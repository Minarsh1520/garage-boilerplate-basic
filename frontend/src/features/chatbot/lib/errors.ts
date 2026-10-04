import { ApiError } from '@google/genai'

// Which step of answering was running when something failed.
export type ChatStage = 'setup' | 'search' | 'record' | 'generation'

// Wraps a failure with the step it happened in, so the catch block can say WHERE.
export class StageError extends Error {
    constructor(public readonly stage: ChatStage, public readonly original: unknown) {
    super(`Chat failed at stage "${stage}"`)
    }
}

export async function atStage<T>(stage: ChatStage, run: () => Promise<T>): Promise<T> {
    try {
        return await run()
    } catch (error) {
        throw new StageError(stage, error)
    }
}

export interface ClassifiedError {
    code: string          // short reference shown to the employee AND written in the log
    side: 'ai' | 'app'    // whose problem it is: Gemini's, or ours
    stage: ChatStage | 'unknown'
    retryable: boolean
    userMessage: string
}

const BUSY = 'The assistant is busy right now. Please try again in a moment.'
const GENERIC = 'Something went wrong while answering. Please try again.'
const NOT_WORKING = 'The assistant is not available right now. Please contact HR if you need help with this.'

// The ONE place that turns a thrown error into a code, a side and an employee message.
// The employee only ever sees the code and a plain message, never the raw error (SECURITY.md).
export function classifyError(error: unknown): ClassifiedError {
    const stage = error instanceof StageError ? error.stage : 'unknown'
    const original = error instanceof StageError ? error.original : error

  // Anything Gemini rejected, whichever step called it (the search embeds the question too).
    if (original instanceof ApiError) {
    const status = original.status
    if (status === 503 || status === 429) return { code: `AI-${status}`, side: 'ai', stage, retryable: true, userMessage: BUSY }
    // 400/401/403/404: bad key, wrong model name, bad request. Retrying won't help; a developer has to fix it.
    return { code: `AI-${status}`, side: 'ai', stage, retryable: false, userMessage: NOT_WORKING }
    }
    if (stage === 'setup') return { code: 'APP-CONFIG', side: 'app', stage, retryable: false, userMessage: NOT_WORKING }
    if (stage === 'search') return { code: 'DB-SEARCH', side: 'app', stage, retryable: true, userMessage: GENERIC }
    if (stage === 'record') return { code: 'DB-RECORD', side: 'app', stage, retryable: true, userMessage: GENERIC }
    return { code: 'APP-UNKNOWN', side: 'app', stage, retryable: true, userMessage: GENERIC }
}