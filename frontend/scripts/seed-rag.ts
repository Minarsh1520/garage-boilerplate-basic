// Usage (from repo root):
//   pnpm --filter frontend add -D tsx          (once)
//   pnpm --filter frontend exec tsx --env-file=../.env scripts/seed-rag.ts
// Seeds the 5 BA demo policies + the demo employees' onboarding records. Safe to re-run:
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

// Fictional demo employees. Alex is the BA's demo employee (BA page requirements).
// Jordan exists only for testing: every task completed, so "all onboarding tasks
// completed" and "another employee's information requested" can both be checked.
const DEMO_EMPLOYEES = [
    {
        email: 'alex.chen@northbridge.example',
        record: {
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
        },
    },
    {
        email: 'jordan.taylor@northbridge.example',
        record: {
            employeeId: 'EMP002',
            name: 'Jordan Taylor',
            role: 'HR Coordinator',
            department: 'People & Culture',
            managerName: 'Priya Nair',
            startDate: '2026-08-03',
            location: 'Melbourne',
            tasks: [
                { id: 'personal-details', label: 'Personal Details Form', status: 'completed' },
                { id: 'tfn', label: 'TFN Declaration', status: 'completed' },
                { id: 'super', label: 'Super Fund Nomination', status: 'completed' },
                { id: 'policies', label: 'Company Policies', status: 'completed' },
                { id: 'it-account', label: 'IT Account', status: 'completed' },
                { id: 'training', label: 'Mandatory Training', status: 'completed' },
            ],
        },
    },
]

// Creates a demo login the first time, then reuses it on every re-run, so nobody
// has to look up or pass a UID. emailVerified: true because the app blocks unverified
// sign-ins, and these fictional addresses can never receive a verification email.
// Both demo logins share DEMO_USER_PASSWORD.
async function ensureDemoUser(app: App, email: string, displayName: string): Promise<string> {
    const auth = getAuth(app)
    const password = process.env.DEMO_USER_PASSWORD
    if (!password) throw new Error('DEMO_USER_PASSWORD not set (add it to the root .env; never commit it)')
    try {
        return (await auth.getUserByEmail(email)).uid
    } catch (error) {
        // Only "user doesn't exist yet" means create it; any other error is a real problem.
        if ((error as { code?: string }).code !== 'auth/user-not-found') throw error
        const created = await auth.createUser({ email, password, displayName, emailVerified: true })
        return created.uid
    }
}

// A policy file must have exactly ONE top-level heading: that heading is the title
// employees see as the source. Stops a stray "# note" line silently becoming the title.
function readPolicyTitle(file: string, markdown: string): string {
    const titles = [...markdown.matchAll(/^#\s+(.+)$/gm)].map((match) => match[1]?.trim())
    if (titles.length !== 1 || !titles[0]) {
        throw new Error(`${file}: expected exactly one "# Title" line, found ${titles.length}`)
    }
    return titles[0]
}

async function main() {
    // 1. Connect to Firebase first. Everything below needs `app`.
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
    if (!serviceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 not set')
    const app = initializeApp({
        credential: cert(JSON.parse(Buffer.from(serviceAccount, 'base64').toString('utf8'))),
    })

    // 2. Gemini + Firestore dependencies for ingestion.
    const deps = { ai: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), db: getFirestore(app) }

    for (const file of readdirSync('seed/policies').filter((f) => f.endsWith('.md'))) {
        const markdown = readFileSync(`seed/policies/${file}`, 'utf8')
        const policyTitle = readPolicyTitle(file, markdown)
        const { chunkCount } = await ingestPolicy(deps, {
        policyId: file.replace(/\.md$/, ''),
        policyTitle,
        markdown,
        })
        console.info(`${file}: ${chunkCount} chunks`)
    }

    // 3. One login + one onboarding record per demo employee. Document ID = Auth uid.
    for (const { email, record } of DEMO_EMPLOYEES) {
        const uid = await ensureDemoUser(app, email, record.name)
        await deps.db.doc(`onboardingProfiles/${uid}`).set({ ...record, _schemaVersion: 1 })
        console.info(`Seeded ${record.name}: ${email} (uid ${uid})`)
    }
}

main().catch((error) => {
    console.error(error)
  // Set the exit code instead of calling process.exit(): Node then exits on its own
  // once Firebase's connections have closed, which avoids a Windows-only crash.
    process.exitCode = 1
})