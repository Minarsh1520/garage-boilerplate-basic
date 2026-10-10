import { describe, it, expect, vi } from 'vitest'
import { ApiError } from '@google/genai'
import type { RagDeps } from '@/lib/rag/types'
import { answerQuestion } from '@/features/chatbot/lib/pipeline'

const ALEX = {
    employeeName: 'Alex Chen',
    checklist: [{ title: 'Super Fund Nomination', status: 'pending' }],
    }
    const CHUNK = { policyId: 'leave-policy', policyTitle: 'Leave Policy', chunkIndex: 0, headingPath: 'Leave Policy > Approval process', text: 'Your manager approves leave.' }

    // Fake Gemini + Firestore: no network, no quota. `decision` is what the "model" returns.
    function fakeDeps(options: {
        decision?: unknown
        hits?: object[]
        faqHits?: object[]
        faqError?: boolean
        record?: object | null
        generate?: () => Promise<unknown>
    }) {
    const embedContent = vi.fn(async () => ({ embeddings: [{ values: Array.from({ length: 768 }, () => 1) }] }))
    const generateContent = vi.fn(options.generate ?? (async () => ({ text: JSON.stringify(options.decision) })))
    const deps = {
        ai: {
        models: {
            embedContent,
            generateContent,
        },
        },
        db: {
        // faqAnswers gets its own results (none by default); every other collection gets policy chunks.
        collection: (name: string) => ({
            findNearest: () => ({
            get: async () => {
                if (name === 'faqAnswers' && options.faqError) throw new Error('index not deployed')
                const rows = name === 'faqAnswers' ? (options.faqHits ?? []) : (options.hits ?? [CHUNK])
                return { docs: rows.map((data, i) => ({ id: `c${i}`, data: () => data, get: () => 0.1 })) }
            },
            }),
        }),
        doc: () => ({
            get: async () => ({ exists: options.record !== null, data: () => options.record ?? ALEX }),
        }),
        },
    } as unknown as RagDeps
    return { deps, generateContent, embedContent }
    }

    const ask = (deps: RagDeps, question: string, earlierQuestion?: string) => answerQuestion(deps, { uid: 'u1', question, earlierQuestion })

    describe('answerQuestion', () => {
    it('escalates a sensitive question without calling the model', async () => {
        const { deps, generateContent } = fakeDeps({})
        const reply = await ask(deps, 'I want to make a complaint')
        expect(reply).toMatchObject({ kind: 'escalate', pathway: 'HR', escalationOffer: { category: 'complaint', pathway: 'HR' } })
        expect(generateContent).not.toHaveBeenCalled()
    })

    it('answers with sources', async () => {
        const { deps } = fakeDeps({ decision: { outcome: 'answer', text: 'Your manager approves it.' } })
        const reply = await ask(deps, 'How does leave approval work?')
        expect(reply).toMatchObject({ kind: 'answer', text: 'Your manager approves it.', sources: [{ policyTitle: 'Leave Policy' }] })
    })

    it('declines off-topic without sending the employee to HR', async () => {
        const { deps } = fakeDeps({ decision: { outcome: 'off_topic' } })
        const reply = await ask(deps, 'Recommend a pasta recipe')
        expect(reply.kind).toBe('fallback')
        expect(reply.text).not.toMatch(/contact HR/i)
    })

    it('asks one clarifying question, then offers suggestions instead of asking again', async () => {
        const { deps } = fakeDeps({ decision: { outcome: 'clarify', text: 'Which form do you mean?' } })
        expect(await ask(deps, 'What do I do with this?')).toMatchObject({ kind: 'clarify', text: 'Which form do you mean?' })
        const second = await ask(deps, 'asdf', 'What do I do with this?')
        expect(second.kind).toBe('fallback')
        expect(second.suggestions?.length).toBeGreaterThan(0)
    })

    it('uses the model-chosen pathway on an escalation', async () => {
        const { deps } = fakeDeps({ decision: { outcome: 'escalate', category: 'other', pathway: 'IT' } })
        expect(await ask(deps, 'My laptop was stolen')).toMatchObject({ kind: 'escalate', pathway: 'IT' })
    })

    it('offers to send a not-found question to HR, and offers nothing for off-topic', async () => {
        const notFound = fakeDeps({ decision: { outcome: 'not_found' } })
        expect((await ask(notFound.deps, 'Who is my buddy?')).escalationOffer).toEqual({ category: 'no-policy', pathway: 'HR' })

        const offTopic = fakeDeps({ decision: { outcome: 'off_topic' } })
        expect((await ask(offTopic.deps, 'Recommend a pasta recipe')).escalationOffer).toBeUndefined()
    })

    it('never claims anything was sent or recorded', async () => {
        const { deps } = fakeDeps({ decision: { outcome: 'escalate' } })
        const reply = await ask(deps, 'I feel overwhelmed')
        expect(reply.text).not.toMatch(/sent|submitted|recorded|escalated/i)
    })

    it('falls back when the model returns something unusable', async () => {
        const { deps } = fakeDeps({ generate: async () => ({ text: 'ESCALATE' }) })
        expect((await ask(deps, 'anything')).kind).toBe('fallback')
    })

    it('still asks the model when there is no policy hit and no record, so the message fits the question', async () => {
        const personal = fakeDeps({ hits: [], record: null, decision: { outcome: 'record_unavailable' } })
        expect((await ask(personal.deps, 'What tasks are left?')).text).toMatch(/on your record/)
        expect(personal.generateContent).toHaveBeenCalledTimes(1)

        const offTopic = fakeDeps({ hits: [], record: null, decision: { outcome: 'off_topic' } })
        expect((await ask(offTopic.deps, 'Recommend a pasta recipe')).text).not.toMatch(/contact HR/i)
    })

    it('escalates when Gemini refuses to process the message', async () => {
        const { deps } = fakeDeps({ generate: async () => ({ text: undefined, promptFeedback: { blockReason: 'SAFETY' } }) })
        expect(await ask(deps, 'someone at work threatened me')).toMatchObject({ kind: 'escalate', pathway: 'HR' })
    })

    it('survives a record with no task list', async () => {
        const { deps, generateContent } = fakeDeps({ record: { employeeName: 'Alex Chen' }, decision: { outcome: 'not_found' } })
        expect((await ask(deps, 'What tasks are left?')).kind).toBe('fallback')
        const prompt = (generateContent.mock.calls[0] as unknown as [{ contents: string }])[0].contents
        expect(prompt).toContain('Onboarding tasks: not available')
    })

    it('reports a Gemini failure with a code and no raw detail', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const { deps } = fakeDeps({ generate: async () => { throw new ApiError({ status: 404, message: 'models/x not found' }) } })
        const reply = await ask(deps, 'anything')
        expect(reply).toMatchObject({ kind: 'error', errorCode: 'AI-404', retryable: false })
        expect(reply.text).not.toContain('models/x')
    })
    it('tells an employee with no tasks on record that it cannot confirm, not that no policy exists', async () => {
    const { deps } = fakeDeps({ record: { employeeName: 'New Starter' }, decision: { outcome: 'record_unavailable' } })
    const reply = await ask(deps, 'What tasks are left?')
    expect(reply.kind).toBe('fallback')
    expect(reply.text).toMatch(/on your record/)
    })

    // ---- Stored answers (Admin FAQ page) ----
    const FAQ = { question: 'How do I request leave?', answer: 'Use My Leave in the Employee Portal.', policyTitle: 'Leave Policy', active: true }

    it('returns a stored answer word for word, with no model call and one embedding', async () => {
        const { deps, generateContent, embedContent } = fakeDeps({ faqHits: [FAQ] })
        const reply = await ask(deps, 'how can I request leave')
        expect(reply).toMatchObject({ kind: 'answer', text: FAQ.answer, fromFaq: true, sources: [{ policyTitle: 'Leave Policy' }] })
        expect(generateContent).not.toHaveBeenCalled()
        expect(embedContent).toHaveBeenCalledTimes(1)
    })

    it('skips a switched-off stored answer and goes to the AI', async () => {
        const { deps, generateContent } = fakeDeps({ faqHits: [{ ...FAQ, active: false }], decision: { outcome: 'answer', text: 'From the policy.' } })
        const reply = await ask(deps, 'How do I request leave?')
        expect(reply).toMatchObject({ kind: 'answer', text: 'From the policy.' })
        expect(reply.fromFaq).toBeUndefined()
        expect(generateContent).toHaveBeenCalledTimes(1)
    })

    it('goes to the AI, embedding only once, when "Get a more detailed answer" is pressed', async () => {
        const { deps, generateContent, embedContent } = fakeDeps({ faqHits: [FAQ], decision: { outcome: 'answer', text: 'Longer answer.' } })
        const reply = await answerQuestion(deps, { uid: 'u1', question: 'How do I request leave?', skipFaq: true })
        expect(reply.text).toBe('Longer answer.')
        expect(generateContent).toHaveBeenCalledTimes(1)
        expect(embedContent).toHaveBeenCalledTimes(1)
    })

    it('does not use stored answers for a reply to a clarifying question', async () => {
        const { deps } = fakeDeps({ faqHits: [FAQ], decision: { outcome: 'answer', text: 'Follow-up answer.' } })
        expect((await ask(deps, 'leave', 'What do I do?')).text).toBe('Follow-up answer.')
    })

    it('still answers with the AI when the stored-answer lookup fails', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { deps } = fakeDeps({ faqError: true, decision: { outcome: 'answer', text: 'From the policy.' } })
        expect(await ask(deps, 'How do I request leave?')).toMatchObject({ kind: 'answer', text: 'From the policy.' })
    })

    it('with no stored answer and no policy, says so instead of inventing one', async () => {
        const { deps } = fakeDeps({ hits: [], decision: { outcome: 'not_found' } })
        const reply = await ask(deps, 'Do we get a gym membership?')
        expect(reply.kind).toBe('fallback')
        expect(reply.text).toMatch(/no approved onboarding information/)
    })
})
