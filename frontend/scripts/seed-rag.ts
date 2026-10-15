// Usage (from repo root):
//   pnpm --filter frontend add -D tsx          (once)
//   pnpm --filter frontend exec tsx --env-file=../.env scripts/seed-rag.ts
// Seeds the 5 BA demo policies, the demo employees' onboarding records and a demo admin.
// Safe to re-run: policy chunks are overwritten, employee records are kept unless --reset is passed.
// Cannot import src/lib/firebase/admin.ts ('server-only' throws outside Next.js),
// so it builds its own Admin connection from the same env var.
import { readFileSync, readdirSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { createGeminiPoolFromEnv } from '../src/lib/rag/gemini-pool'
import { FAQ_COLLECTION, saveFaq } from '../src/lib/rag/faq'
import { markdownToForm } from '../src/lib/rag/policy-sources'
import { publishPolicy } from '../src/lib/rag/publish'
import { getAuth } from 'firebase-admin/auth'
import type { App } from 'firebase-admin/app'
import { EMPLOYEE_COLLECTION } from '../src/features/chatbot/lib/record'
import type { EmployeeOnboarding } from '../src/lib/onboarding'

// The onboarding checklist every demo employee gets. Titles are the BA's six tasks;
// the deadlines are the ones in seed/policies/onboarding-guide.md, so the Home page
// checklist and the assistant's policy answers agree.
const CHECKLIST = [
    { id: 'personal-details', title: 'Personal Details Form', description: 'Submit your address, phone number and emergency contact in the Employee Portal.', duein: 'Before your first day' },
    { id: 'tfn', title: 'TFN Declaration', description: 'Submit your Tax File Number declaration so payroll can tax your pay correctly.', duein: 'Before your first day' },
    { id: 'super', title: 'Super Fund Nomination', description: 'Nominate the super fund your contributions are paid into.', duein: '28 days from your start date' },
    { id: 'policies', title: 'Company Policies', description: 'Read and acknowledge the company policies.', duein: '14 days from your start date' },
    { id: 'it-account', title: 'IT Account', description: 'Activated during your IT setup session.', duein: 'Your first day' },
    { id: 'training', title: 'Mandatory Training', description: 'Complete the three online modules in the Learning Hub.', duein: '30 days from your start date' },
]

// One record in the shape src/lib/onboarding.ts defines (EmployeeOnboarding). `pending`
// lists the checklist ids still to do; every other item is completed. The three summary
// statuses are worked out FROM the checklist, so they can't disagree with it.
function demoRecord(
    details: Pick<EmployeeOnboarding, 'employeeId' | 'employeeName' | 'jobTitle' | 'department' | 'manager' | 'startDate' | 'location'>,
    pending: string[]
): EmployeeOnboarding {
    const status = (id: string) => (pending.includes(id) ? 'pending' : 'completed')
    return {
        ...details,
        onboardingStatus: pending.length > 0 ? 'In Progress' : 'Completed',
        itAccountStatus: status('it-account') === 'completed' ? 'Active' : 'Pending',
        mandatoryTrainingStatus: status('training'),
        checklist: CHECKLIST.map((item) => ({ ...item, status: status(item.id) })),
    }
}

// Fictional demo employees. Alex is the BA's demo employee (BA page requirements).
// Jordan exists only for testing: every task completed, so "all onboarding tasks
// completed" and "another employee's information requested" can both be checked.
const DEMO_EMPLOYEES = [
    {
        email: 'alex.chen@northbridge.example',
        record: demoRecord(
            { employeeId: 'EMP001', employeeName: 'Alex Chen', jobTitle: 'Junior Software Developer', department: 'IT', manager: 'Sarah Lee', startDate: '2026-09-14', location: 'Melbourne' },
            ['super', 'policies', 'training']
        ),
    },
    {
        email: 'jordan.taylor@northbridge.example',
        record: demoRecord(
            { employeeId: 'EMP002', employeeName: 'Jordan Taylor', jobTitle: 'HR Coordinator', department: 'People & Culture', manager: 'Priya Nair', startDate: '2026-08-03', location: 'Melbourne' },
            []
        ),
    },
]

// The demo HR login for the Admin pages. An admin is a user whose `users` document has
// role 'admin' (see requireAdmin in src/actions/auth.actions.ts).
const DEMO_ADMIN = { email: 'hr.admin@northbridge.example', displayName: 'HR Admin' }

// `--reset` puts the demo records back to their starting state. Without it, a record
// that already exists is left alone, so re-seeding policies never wipes checklist progress.
const RESET = process.argv.includes('--reset')

// Creates a demo login the first time, then reuses it on every re-run, so nobody
// has to look up or pass a UID. emailVerified: true because the app blocks unverified
// sign-ins, and these fictional addresses can never receive a verification email.
// All demo logins share DEMO_USER_PASSWORD.
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
// Drafts written from the seed policies. Each answer only repeats what its policy says.
const STARTER_FAQS = [
    {
        question: 'How do I request leave?',
        answer: 'Submit your leave request in the Employee Portal under My Leave. For planned annual leave, submit it at least two weeks before the first day of leave. Your manager reviews it, usually within three business days.',
        policyTitle: 'Leave Policy',
    },
    {
        question: 'What should I do if I am running late?',
        answer: 'Message your manager before 9:30 am to let them know you are running late.',
        policyTitle: 'Workplace & Attendance Policy',
    },
    {
        question: 'What should I do if I am sick and cannot come to work?',
        answer: 'Notify your manager before your usual start time, by phone or team chat, and then submit personal leave in the Employee Portal.',
        policyTitle: 'Workplace & Attendance Policy',
    },
    {
        question: 'When do I need to complete mandatory training?',
        answer: 'Mandatory training is three online modules in the Learning Hub. The Workplace Health and Safety (WHS) Induction must be completed before your first day. The other two, Privacy and Information Security and Respect at Work, are due within 30 days of your start date.',
        policyTitle: 'New Employee Onboarding Guide',
    },
    {
        question: 'How do I set up my IT account?',
        answer: 'Your IT account is activated at the IT setup session at 10:00 am on your first day. For help, contact the IT Service Desk at itsupport@northbridge.example or 03 9000 1300.',
        policyTitle: 'IT & System Access Guide',
    },
]

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
    const deps = { ai: createGeminiPoolFromEnv(), db: getFirestore(app) }

    // Published the same way as the Admin page does, so the seed policies show up in the
    // Policy page list too and can be edited there. The id stays the file name, as before,
    // so re-seeding replaces the existing chunks instead of adding a second copy.
    for (const file of readdirSync('seed/policies').filter((f) => f.endsWith('.md'))) {
        const markdown = readFileSync(`seed/policies/${file}`, 'utf8')
        readPolicyTitle(file, markdown) // fails loudly on a file without exactly one "# Title"
        const policyId = file.replace(/\.md$/, '')
        // 'replace': the seed files are the source of truth for the demo policies.
        const result = await publishPolicy(deps, { form: markdownToForm(markdown), source: 'seed', uid: 'seed-script', policyId, mode: 'replace' })
        if (result.status !== 'ready') throw new Error(`${file}: publishing failed (see the error above)`)
        console.info(`${file}: ${result.chunkCount} chunks`)
    }

    // Starter stored answers, ONLY when there are none yet, so HR's own edits are never
    // overwritten. Added switched OFF: HR reads and approves each one on the Admin page first.
    if ((await deps.db.collection(FAQ_COLLECTION).limit(1).get()).empty) {
        for (const faq of STARTER_FAQS) await saveFaq(deps, { ...faq, active: false, savedBy: 'seed-script' })
        console.info(`Added ${STARTER_FAQS.length} starter stored answers (switched off until HR approves them)`)
    }

    // 3. One login + one onboarding record per demo employee. Document ID = Auth uid.
    for (const { email, record } of DEMO_EMPLOYEES) {
        const uid = await ensureDemoUser(app, email, record.employeeName)
        const ref = deps.db.doc(`${EMPLOYEE_COLLECTION}/${uid}`)
        if (!RESET && (await ref.get()).exists) {
            console.info(`Kept existing record for ${record.employeeName} (run with --reset to overwrite)`)
            continue
        }
        await ref.set(record)
        console.info(`Seeded ${record.employeeName}: ${email} (uid ${uid})`)
    }

    // 4. The demo admin. The role is set here because only the Admin SDK may set it:
    //    the security rules stop a user changing their own role.
    const adminUid = await ensureDemoUser(app, DEMO_ADMIN.email, DEMO_ADMIN.displayName)
    const adminRef = deps.db.doc(`users/${adminUid}`)
    if ((await adminRef.get()).exists) {
        await adminRef.update({ role: 'admin', updatedAt: FieldValue.serverTimestamp() })
    } else {
        await adminRef.set({
            uid: adminUid,
            email: DEMO_ADMIN.email,
            displayName: DEMO_ADMIN.displayName,
            photoURL: null,
            role: 'admin',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            _schemaVersion: 1,
        })
    }
    console.info(`Admin login: ${DEMO_ADMIN.email} (uid ${adminUid})`)
}

main().catch((error) => {
    console.error(error)
  // Set the exit code instead of calling process.exit(): Node then exits on its own
  // once Firebase's connections have closed, which avoids a Windows-only crash.
    process.exitCode = 1
})