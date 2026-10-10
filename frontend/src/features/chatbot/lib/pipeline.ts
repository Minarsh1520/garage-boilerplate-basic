import { GEN_MODEL } from '@/lib/rag/config'
import { embedText } from '@/lib/rag/embed'
import { matchFaq } from '@/lib/rag/faq'
import { searchPolicies, type RetrievedChunk } from '@/lib/rag/retrieve'
import { withRetry } from '@/lib/rag/retry'
import type { RagDeps } from '@/lib/rag/types'
import type { AssistantReply, CaseCategory, Pathway } from '../types'
import { buildPrompt, DECISION_JSON_SCHEMA, parseDecision, SYSTEM_PROMPT, wasBlocked } from './decision'
import { atStage, classifyError } from './errors'
import { formatRecord, readOwnRecord } from './record'
import { matchSensitiveRule } from './rules'

// Basic RAG for this sprint: ONE model call per question, so it fits the free tier.
// No 'use server' and no 'server-only' in this file: everything it needs is passed in
// as `deps`, so the Server Action AND scripts/probe-chat.ts can both run it.

const NOT_FOUND_MESSAGE =
    'There is currently no approved onboarding information I can use to answer that. I can send your question to the HR team if you would like.'
const OFF_TOPIC_MESSAGE =
    'I can only help with questions about your onboarding, such as your checklist, leave, IT access and company policies.'
const UNCLEAR_MESSAGE =
    "Sorry, I couldn't catch that. You can pick one of the questions below, or contact HR directly for help."
// Shown as buttons after two unclear messages in a row, so the next input is one we understand.
const SUGGESTED_QUESTIONS = [
    'What onboarding tasks do I still need to complete?',
    'When do I need to complete mandatory training?',
    'How do I request leave?',
    'How do I set up my IT account?',
]
// The policies may well cover the topic; what's missing is THIS employee's own data.
// Says "I can't see", not "you have none": the assistant doesn't know which it is.
const RECORD_UNAVAILABLE_MESSAGE =
  "I can't see any onboarding tasks or details on your record yet, so I can't confirm that. I can ask the HR team to check that your onboarding has been set up."
// These OFFER to pass the matter on; they never claim it was sent (BA rule). A case is
// only saved when the employee presses the button, in requestEscalation().
const ESCALATION_MESSAGES: Record<Pathway, string> = {
    HR: 'This needs to be handled by a person rather than the AI Assistant. I can send it to the HR team if you would like.',
    IT: 'This needs to be handled by a person rather than the AI Assistant. Please contact IT Support directly. I can also log it with the HR team if you would like.',
    Manager: 'This is a decision for your manager rather than the AI Assistant. Please speak with your manager directly. I can also log it with the HR team if you would like.',
}

function reply(kind: AssistantReply['kind'], text: string, extra: Partial<AssistantReply> = {}): AssistantReply {
    return { kind, text, sources: [], ...extra }
}

// Every reply that hands the matter to a person carries an offer, which the chat window
// shows as a "Send to HR team" button.
function escalate(pathway: Pathway, category: CaseCategory): AssistantReply {
    return reply('escalate', ESCALATION_MESSAGES[pathway], { pathway, escalationOffer: { category, pathway } })
}

// Each policy section is listed once, even if several of its chunks were retrieved.
function toSources(hits: RetrievedChunk[]) {
    const seen = new Map<string, { policyTitle: string; headingPath: string }>()
    for (const h of hits) seen.set(`${h.policyId}|${h.headingPath}`, { policyTitle: h.policyTitle, headingPath: h.headingPath })
    return [...seen.values()]
}

// One log line that says which side failed, at which step, under which code.
export function errorReply(error: unknown): AssistantReply {
    const classified = classifyError(error)
    console.error(`[chat] ${classified.code} side=${classified.side} stage=${classified.stage}`, error)
    return reply('error', `${classified.userMessage} (Ref: ${classified.code})`, {
    errorCode: classified.code,
    retryable: classified.retryable,
    })
}

export async function answerQuestion(
    deps: RagDeps,
    input: { uid: string; question: string; earlierQuestion?: string; skipFaq?: boolean }
): Promise<AssistantReply> {
    const { uid, question, earlierQuestion, skipFaq } = input

  // 1. Obvious sensitive matters → human, with zero model calls.
    const rule = matchSensitiveRule(question)
    if (rule) return escalate(rule.pathway, rule.category)

    try {
    // 2. Embed the question ONCE. The same vector is used for the stored-answer check and
    //    the policy search. A follow-up is searched together with the question it follows up on.
    const searchText = earlierQuestion ? `${earlierQuestion} ${question}` : question
    const queryVector = await atStage('search', () => embedText(deps.ai, searchText, 'RETRIEVAL_QUERY'))

    // 3. Stored answers first. Skipped for follow-ups to a clarifying question (the stored
    //    answer was written for a stand-alone question) and when the employee asked for more detail.
    //    No close match → carry on to the AI below, which may only use the policies it is given.
    if (!skipFaq && !earlierQuestion) {
        // A failed FAQ lookup (e.g. its index not deployed yet) must not stop the chat:
        // log it and let the AI answer instead.
        const faq = await matchFaq(deps, queryVector).catch((error) => {
            console.warn('[chat] FAQ lookup failed, answering with the AI instead', error)
            return null
        })
        if (faq) {
            const sources = faq.policyTitle ? [{ policyTitle: faq.policyTitle, headingPath: faq.policyTitle }] : []
            return reply('answer', faq.answer, { sources, fromFaq: true })
        }
    }

    // 4. The policy search and the record lookup don't depend on each other, so they run in parallel.
    const [hits, recordResult] = await Promise.all([
        atStage('search', () => searchPolicies(deps, queryVector)),
        atStage('record', () => readOwnRecord(deps, uid)),
    ])
    const record = recordResult.status === 'ok' ? recordResult.record : null

    // No shortcut when there are no policy hits and no record: only the model can tell
    // "about my own record" from "off-topic" from "no policy covers this", and each of
    // those gets a different message.

    // 5. One model call that returns a decision, not free text.
    // headingPath already starts with the policy title, so it's used on its own.
    const policies = hits.length > 0 ? hits.map((h) => `(${h.headingPath})\n${h.text}`).join('\n\n') : '(none found)'
    const response = await atStage('generation', () =>
      // Two attempts, not three: a failed call can take ~9s to come back, and the employee is watching a spinner.
        withRetry(() => deps.ai.models.generateContent({
        model: GEN_MODEL,
        contents: buildPrompt({ question, earlierQuestion, policies, record: record ? formatRecord(record) : 'not available' }),
        config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0,
            responseMimeType: 'application/json',
            responseJsonSchema: DECISION_JSON_SCHEMA,
            },
        }), 2)
    )
    // A message Gemini refuses to process is, by definition, not one for the AI to handle.
    // Send it to a person instead of telling the employee "no approved information".
    if (wasBlocked(response)) return escalate('HR', 'other')

    const decision = parseDecision(response.text)

    // 6. CODE decides what each outcome means for the employee.
    switch (decision.outcome) {
        case 'answer':
            return reply('answer', decision.text ?? '', { sources: toSources(hits) })
        case 'clarify':
            // Only ONE clarifying question per topic. Unclear again → stop asking and offer ready-made questions.
            return earlierQuestion
            ? reply('fallback', UNCLEAR_MESSAGE, { suggestions: SUGGESTED_QUESTIONS })
            : reply('clarify', decision.text ?? '')
        case 'record_unavailable':
            return reply('fallback', RECORD_UNAVAILABLE_MESSAGE, { escalationOffer: { category: 'other', pathway: 'HR' } })
        case 'off_topic':
            return reply('fallback', OFF_TOPIC_MESSAGE)
        case 'escalate':
            return escalate(decision.pathway ?? 'HR', decision.category ?? 'other')
        case 'not_found':
            return reply('fallback', NOT_FOUND_MESSAGE, { escalationOffer: { category: 'no-policy', pathway: 'HR' } })
        }
    } catch (error) {
        return errorReply(error)
    }
}