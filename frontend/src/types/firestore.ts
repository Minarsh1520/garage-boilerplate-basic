import type { Timestamp } from 'firebase/firestore'

/**
 * Firestore collection type definitions.
 *
 * Keep in sync with:
 *   - src/lib/firebase/firestore.ts  (typed collection exports)
 *   - firebase/firestore.rules       (security rules)
 *   - docs/FIRESTORE-SCHEMA.md       (schema documentation)
 */

export interface UserProfile {
  uid: string
  email: string
  displayName: string | null
  photoURL: string | null
  role: 'user'
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

export type CreateUserProfileInput = Omit<UserProfile, 'createdAt' | 'updatedAt'>

export interface Note {
  id: string
  uid: string // owner's user id — used by security rules
  title: string
  body: string
  createdAt: Timestamp
  updatedAt: Timestamp
  _schemaVersion: 1
}

// One row per chunk of an approved policy document. Parent-document info is
// copied onto every chunk so a search hit is self-describing (no second read).
export interface PolicyChunk {
  policyId: string        // stable slug, e.g. 'leave-policy' — groups a document's chunks
  policyTitle: string     // shown to the employee as the answer's source
  chunkIndex: number      // original order, used to rebuild the full document
  headingPath: string     // e.g. 'Leave Policy > Requesting leave' (from the chunker)
  context: string         // LLM-written situating text — embedded for search, never displayed
  text: string            // the ORIGINAL policy wording — the only text shown to employees
  // embedding: Firestore VectorValue, written via the Admin SDK only — deliberately not typed here
  createdAt: Timestamp
  _schemaVersion: 1
}

// Demo employee record (BA doc: Alex Chen, EMP001). Document ID = Firebase Auth uid,
// so the agent can only ever read the signed-in user's own record (see agent/tools.ts).
// "Onboarding Status" is not stored: it's derived from tasks, so it can never disagree with them.
export interface OnboardingProfile {
  employeeId: string
  name: string
  role: string
  department: string
  managerName: string
  startDate: string       // ISO date, e.g. '2026-09-14'
  location: string
  tasks: { id: string; label: string; status: 'completed' | 'pending' }[]
  _schemaVersion: 1
}