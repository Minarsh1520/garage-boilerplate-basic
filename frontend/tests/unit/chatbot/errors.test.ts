import { describe, it, expect } from 'vitest'
import { ApiError } from '@google/genai'
import { classifyError, StageError } from '@/features/chatbot/lib/errors'

describe('classifyError', () => {
    it('reports a Gemini overload as AI-side and retryable', () => {
        const error = new StageError('generation', new ApiError({ status: 503, message: 'overloaded' }))
        expect(classifyError(error)).toMatchObject({ code: 'AI-503', side: 'ai', stage: 'generation', retryable: true })
    })

    it('reports a Gemini failure during the search as AI-side too', () => {
        const error = new StageError('search', new ApiError({ status: 429, message: 'quota' }))
        expect(classifyError(error)).toMatchObject({ code: 'AI-429', side: 'ai', stage: 'search' })
    })

    it('does not offer a retry for a bad key or model name', () => {
        const error = new StageError('generation', new ApiError({ status: 404, message: 'model not found' }))
        expect(classifyError(error)).toMatchObject({ code: 'AI-404', retryable: false })
    })

    it.each([
        ['setup', 'APP-CONFIG'],
        ['search', 'DB-SEARCH'],
        ['record', 'DB-RECORD'],
        ['generation', 'APP-UNKNOWN'],
    ] as const)('reports a non-Gemini failure at %s as %s', (stage, code) => {
        expect(classifyError(new StageError(stage, new Error('boom')))).toMatchObject({ code, side: 'app' })
    })

    it('never puts the raw error text in the employee message', () => {
        const classified = classifyError(new StageError('record', new Error('permission denied on onboardingProfiles/abc')))
        expect(classified.userMessage).not.toContain('onboardingProfiles')
    })
})