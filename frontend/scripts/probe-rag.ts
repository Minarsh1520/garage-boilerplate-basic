// Usage: pnpm --filter frontend exec tsx --env-file=.env.local scripts/probe-rag.ts
// Run AFTER seed-rag.ts. Searches with NO threshold and prints every distance, so we
// can see where relevant and off-topic matches actually fall, then pick
// RAG_DISTANCE_THRESHOLD between them. Read-only: writes nothing.
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { GoogleGenAI } from '@google/genai'
import { embedText } from '../src/lib/rag/embed'

// The BA's three test questions, plus off-topic controls that SHOULD score badly.
const QUESTIONS = [
  { question: 'When do I need to complete mandatory training?', expect: 'relevant' },
  { question: 'Have I completed everything required for my onboarding?', expect: 'relevant' },
  { question: 'How do I request annual leave?', expect: 'relevant' },
  { question: 'What is the weather in Melbourne today?', expect: 'off-topic' },
  { question: 'Recommend a good pasta recipe', expect: 'off-topic' },
]

async function main() {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
  if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 not set')
  const app = initializeApp({ credential: cert(JSON.parse(Buffer.from(serviceAccount, 'base64').toString('utf8'))) })
  const db = getFirestore(app)
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  for (const { question, expect } of QUESTIONS) {
    const queryVector = await embedText(ai, question, 'RETRIEVAL_QUERY')
    const snapshot = await db
      .collection('hrKnowledge')
      .findNearest({ vectorField: 'embedding', queryVector, limit: 5, distanceMeasure: 'COSINE', distanceResultField: 'distance' })
      .get()

    console.info(`\n[${expect}] ${question}`)
    for (const doc of snapshot.docs) {
      const stored = doc.get('embedding') as { toArray(): number[] }
      // Both vectors are unit length, so their dot product IS the cosine similarity.
      // If Firestore's distance ≈ 1 - dot, the formula in config.ts is confirmed on real data.
      const dot = stored.toArray().reduce((sum, v, i) => sum + v * (queryVector[i] ?? 0), 0)
      console.info(
        // headingPath already starts with the policy title, so it's printed on its own.
        `  distance=${(doc.get('distance') as number).toFixed(3)}  1-dot=${(1 - dot).toFixed(3)}  ${doc.get('headingPath')}`
      )
    }
  }
}

main().catch((error) => {
  console.error(error)
  // Set the exit code instead of calling process.exit(): Node then exits on its own
  // once Firebase's connections have closed, which avoids a Windows-only crash.
  process.exitCode = 1
})