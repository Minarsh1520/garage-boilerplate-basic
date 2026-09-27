// Usage (from repo root):
//   pnpm --filter frontend add -D tsx          (once)
//   pnpm --filter frontend exec tsx --env-file=../.env scripts/seed-rag.ts
// Seeds the 5 BA demo policies + Alex Chen's onboarding record. Safe to re-run:
// deterministic IDs overwrite instead of duplicating.
// Cannot import src/lib/firebase/admin.ts ('server-only' throws outside Next.js),
// so it builds its own Admin connection from the same env var.
import { readFileSync, readdirSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { GoogleGenAI } from '@google/genai'
import { ingestPolicy } from '../src/lib/rag/ingest'
import { getAuth } from 'firebase-admin/auth'
import type { App } from 'firebase-admin/app'

const DEMO_EMAIL = 'alex.chen@northbridge.example'

// Creates Alex's demo login the first time, then reuses it on every re-run, so nobody
// has to look up or pass a UID. emailVerified: true because the app blocks unverified
// sign-ins, and this fictional address can never receive a verification email.
async function ensureDemoUser(app: App): Promise<string> {
    const auth = getAuth(app)
    const password = process.env.DEMO_USER_PASSWORD
    if (!password) throw new Error('DEMO_USER_PASSWORD not set (add it to the root .env; never commit it)')
    try {
        return (await auth.getUserByEmail(DEMO_EMAIL)).uid
    } catch (error) {
        // Only "user doesn't exist yet" means create it; any other error is a real problem.
        if ((error as { code?: string }).code !== 'auth/user-not-found') throw error
        const created = await auth.createUser({ email: DEMO_EMAIL, password, displayName: 'Alex Chen', emailVerified: true })
        return created.uid
    }
}

async function main() {
    // 1. Connect to Firebase first. Everything below needs `app`.
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
    if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 not set')
    const app = initializeApp({
        credential: cert(JSON.parse(Buffer.from(serviceAccount, 'base64').toString('utf8'))),
    })

    // 2. Find or create Alex's login. Needs `app`, so it must come after step 1.
    const uid = await ensureDemoUser(app)
    console.info(`Demo login: ${DEMO_EMAIL} (uid ${uid})`)

    // 3. Gemini + Firestore dependencies for ingestion.
    const deps = { ai: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), db: getFirestore(app) }

    for (const file of readdirSync('seed/policies').filter((f) => f.endsWith('.md'))) {
        const markdown = readFileSync(`seed/policies/${file}`, 'utf8')
        const policyTitle = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? file // first H1 = title
        const { chunkCount } = await ingestPolicy(deps, {
        policyId: file.replace(/\.md$/, ''),
        policyTitle,
        markdown,
        })
        console.info(`${file}: ${chunkCount} chunks`)
    }

  // Fictional demo data, exactly as specified in the BA page requirements.
    await deps.db.doc(`onboardingProfiles/${uid}`).set({
    employeeId: 'EMP001',
    name: 'Alex Chen',
    role: 'Junior Software Developer',
    department: 'IT',
    managerName: 'Sarah Lee',
    startDate: '2026-09-14',
    location: 'Melbourne',
    tasks: [
        { id: 'personal-details', label: 'Personal Details Form', status: 'completed' },
        { id: 'tfn', label: 'TFN Declaration', status: 'completed' },
        { id: 'super', label: 'Super Fund Nomination', status: 'pending' },
        { id: 'policies', label: 'Company Policies', status: 'pending' },
        { id: 'it-account', label: 'IT Account', status: 'completed' }, // BA: "Active"
        { id: 'training', label: 'Mandatory Training', status: 'pending' },
    ],
    _schemaVersion: 1,
    })
    console.info(`Seeded onboarding profile for ${uid}`)
}

main().catch((error) => {
  console.error(error)
  // Set the exit code instead of calling process.exit(): Node then exits on its own
  // once Firebase's connections have closed, which avoids a Windows-only crash.
  process.exitCode = 1
})