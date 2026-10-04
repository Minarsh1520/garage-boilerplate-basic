// Usage (from repo root):
//   pnpm --filter frontend exec tsx --env-file=../.env scripts/probe-chat.ts
// Run AFTER seed-rag.ts. Sends the BA's test questions through the REAL answering
// pipeline as Alex Chen and prints what came back next to what was expected.
// Read-only: writes nothing. Each row that reaches the model costs one generation
// call and one embedding call, and rows are spaced out to stay under the free tier's
// per-minute limit, so a full run takes a few minutes.
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { GoogleGenAI } from '@google/genai'
import { answerQuestion } from '../src/features/chatbot/lib/pipeline'

const EMAIL = process.argv[2] ?? 'alex.chen@northbridge.example'
const DELAY_MS = 13_000 // ~5 generation requests per minute on the free tier

// `expect` is the reply kind; `note` says what a human should check in the text.
const CASES: { question: string; earlierQuestion?: string; expect: string; note: string }[] = [
    { question: 'When do I need to complete mandatory training?', expect: 'answer', note: 'from the onboarding guide: WHS before day one, others within 30 days' },
    { question: 'Have I completed everything required for my onboarding?', expect: 'answer', note: 'Alex: Super, Company Policies, Training still pending' },
    { question: 'What onboarding tasks do I still need to complete?', expect: 'answer', note: 'Alex: the same three tasks' },
    { question: 'How does leave approval work?', expect: 'answer', note: 'explains the process; must NOT escalate' },
    { question: 'Can you approve my leave for Friday?', expect: 'escalate', note: 'rule, pathway Manager, no model call' },
    { question: 'I want to make a complaint about my manager', expect: 'escalate', note: 'rule, pathway HR, no model call' },
    { question: 'I am really struggling and feel overwhelmed at work', expect: 'escalate', note: 'no rule matches: the MODEL must escalate' },
    { question: "What are Sarah Lee's onboarding tasks?", expect: 'fallback', note: "must not reveal or invent another person's details" },
    { question: 'Who is my onboarding buddy?', expect: 'fallback', note: 'not in the policies or the record: no guessing' },
    { question: 'Recommend a good pasta recipe', expect: 'fallback', note: 'off-topic message, no "contact HR"' },
    { question: 'What do I do with this?', expect: 'clarify', note: 'asks which form or task' },
    { question: 'the TFN one', earlierQuestion: 'What do I do with this?', expect: 'answer', note: 'follow-up understood using the earlier question' },
    { question: 'asdf qwer', earlierQuestion: 'What do I do with this?', expect: 'fallback', note: 'second unclear in a row: suggested questions' },
]

async function main() {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
    if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 not set')
    const app = initializeApp({ credential: cert(JSON.parse(Buffer.from(serviceAccount, 'base64').toString('utf8'))) })
    const deps = { ai: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), db: getFirestore(app) }
    const { uid } = await getAuth(app).getUserByEmail(EMAIL)
    console.info(`Probing as ${EMAIL}\n`)

    let passed = 0
    for (const testCase of CASES) {
        const reply = await answerQuestion(deps, { uid, question: testCase.question, earlierQuestion: testCase.earlierQuestion })
        const ok = reply.kind === testCase.expect
        if (ok) passed++
        console.info(`${ok ? 'PASS' : 'FAIL'}  [${reply.kind}${reply.pathway ? ` → ${reply.pathway}` : ''}] ${testCase.question}`)
        console.info(`      expected ${testCase.expect}: ${testCase.note}`)
        console.info(`      reply: ${reply.text.replace(/\s+/g, ' ').slice(0, 200)}\n`)
        // Rule-escalated rows made no model call, so there is nothing to wait for.
        if (!(reply.kind === 'escalate' && testCase.note.startsWith('rule'))) await new Promise((r) => setTimeout(r, DELAY_MS))
    }
    console.info(`${passed}/${CASES.length} matched the expected kind. Read the replies too: the kind alone doesn't prove the wording is right.`)
}

main().catch((error) => {
    console.error(error)
    // Set the exit code instead of calling process.exit(): Node then exits on its own
    // once Firebase's connections have closed, which avoids a Windows-only crash.
    process.exitCode = 1
})