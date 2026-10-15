# Firestore Schema

## Overview

All collections use the typed collection pattern — see `frontend/src/lib/firebase/firestore.ts`.
Security rules are in `firebase/firestore.rules`.

## Schema versioning

Every document in every collection **must** include a `_schemaVersion` field:

\`\`\`typescript
_schemaVersion: 1  // increment when doing a breaking schema change
\`\`\`

This enables **lazy migration** — when a document is read, check `_schemaVersion` and migrate on the fly if it's behind current.

**Rules:**
- `_schemaVersion` is always `1` on creation
- Non-breaking changes (adding optional fields with defaults) keep the same version
- Breaking changes (rename, remove, type change) increment the version and require a migration function
- Never remove `_schemaVersion` from a schema

---

## `users` collection

**Path:** `/users/{userId}`
**Access:** Owner-only (user can read/write their own document; admins can read all)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | `string` | Yes | Firebase Auth UID (same as document ID) |
| `email` | `string` | Yes | User's email address |
| `displayName` | `string \| null` | Yes | Display name from Auth or profile |
| `photoURL` | `string \| null` | Yes | Profile photo URL |
| `role` | `'user' \| 'admin'` | Yes | User role — immutable by user after creation |
| `createdAt` | `Timestamp` | Yes | When the document was created |
| `updatedAt` | `Timestamp` | Yes | When the document was last updated |
| `_schemaVersion` | `1` | Yes | Schema version for lazy migration |

**Creation:** Auto-created by `AuthProvider` on first sign-in via `syncUserProfile()`.
**Deletion:** Hard-delete is disabled in security rules. Use `deletedAt` field for soft-delete.

---

## `notes` collection

**Path:** `/notes/{noteId}`
**Access:** Owner-only

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | `string` | Yes | Owner's Firebase Auth UID |
| `title` | `string` | Yes | Note title (1–200 chars) |
| `body` | `string` | Yes | Note body (≤10 000 chars) |
| `createdAt` | `Timestamp` | Yes | Creation time |
| `updatedAt` | `Timestamp` | Yes | Last update time |
| `_schemaVersion` | `1` | Yes | Schema version for lazy migration |

---

<!-- Add new collection schemas below -->

All collections below are written and read on the server (Admin SDK) unless stated. The security rules block browsers from them.

---

## `employeeData` collection

**Path:** `/employeeData/{uid}` (document ID = the employee's Firebase Auth UID)
**Type:** `EmployeeOnboarding` in `frontend/src/lib/onboarding.ts`
**Read by:** Home page checklist, chatbot (`features/chatbot/lib/record.ts`)
**Written by:** seed script; the Admin "Add Employee" form (planned)

| Field | Type | Description |
|-------|------|-------------|
| `employeeId` | `string` | e.g. `EMP001` |
| `employeeName` | `string` | Full name |
| `jobTitle` | `string` | Role |
| `department` | `string` | Department |
| `manager` | `string` | Manager's name |
| `startDate` | `string` | ISO date, e.g. `2026-09-14` |
| `location` | `string` | Office |
| `onboardingStatus` | `string` | `In Progress` or `Completed`, worked out from the checklist |
| `itAccountStatus` | `string` | `Active` or `Pending` |
| `mandatoryTrainingStatus` | `'completed' \| 'pending'` | |
| `checklist` | `{ id, title, description, status, duein }[]` | `status` is `'completed' \| 'pending'` |

The chatbot reads the checklist only and ignores the three status fields, so it can't contradict the checklist.

---

## `hrKnowledge` collection

**Path:** `/hrKnowledge/{policyId}_{chunkIndex}`
**Type:** `PolicyChunk` in `frontend/src/types/firestore.ts`
**Written by:** `ingestPolicy` (`lib/rag/ingest.ts`), called by the seed script and, from this sprint, the Admin policy upload
**Read by:** chatbot policy search (`lib/rag/retrieve.ts`)

One document per section of an approved policy. Fields: `policyId`, `policyTitle`, `chunkIndex`, `headingPath`, `context`, `text`, `embedding` (768-dimension vector), `createdAt`, `_schemaVersion`.
**Index:** vector index on `embedding`, 768 dimensions, in `firebase/firestore.indexes.json`. Changing the embedding model or size means re-seeding every policy and redeploying this index.

---

## `escalationCases` collection

**Path:** `/escalationCases/{autoId}`
**Written by:** `createEscalationCase` (`features/chatbot/lib/escalation.ts`), only when the employee presses "Send to HR team"
**Read by:** `getEscalationCases` (`actions/escalation.actions.ts`), Admin Escalation Cases page

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'HR' \| 'IT' \| 'Manager'` | Support pathway |
| `title` | `string` | Heading for the category |
| `summary` | `string` | The employee's question |
| `status` | `string` | `open` at creation |
| `createdAt` | `Timestamp` | Server time |
| `employeeName`, `employeeId` | `string` | From `employeeData`; absent if there is no record |
| `employeeUid` | `string` | Who sent it, from the sign-in session |
| `category` | `string` | e.g. `complaint`, `pay`, `no-policy` |
| `priority` | `1 \| 2 \| 3` | 1 = look at first |
| `_schemaVersion` | `1` | |

---

## `policyDocuments` collection

**Path:** `/policyDocuments/{policyId}` (same id as the policy's chunks in `hrKnowledge`)
**Written by:** `publishPolicy` (`lib/rag/publish.ts`), called by the Admin Policy page and the seed script
**Read by:** Admin Policy page (`getPolicies`, `getPolicyForm`). The chatbot never reads it.

| Field | Type | Description |
|-------|------|-------------|
| `policyId` | `string` | e.g. `leave-policy` |
| `title` | `string` | Policy title |
| `form` | `{ title, intro?, sections: { heading, body }[] }` | What was published, so it can be edited again |
| `source` | `'pdf' \| 'form' \| 'seed'` | How it was added |
| `fileName` | `string?` | The uploaded PDF's name |
| `status` | `'processing' \| 'ready' \| 'failed'` | `ready` = in use by the chatbot. A row still `processing` after 5 minutes is shown as failed |
| `chunkCount` | `number?` | Sections saved to `hrKnowledge` |
| `version` | `number` | Goes up by one on every publish. Edit sends back the version it opened, so a newer publish by someone else is caught instead of overwritten |
| `error` | `string?` | Set when `failed` |
| `updatedBy`, `updatedAt` | `string`, `Timestamp` | |
| `_schemaVersion` | `2` | v1 rows (`fileData`, no `status`) are shown as "not published" |

---

## `faqAnswers` collection

**Path:** `/faqAnswers/{autoId}`
**Written by:** Admin Stored Answers page (`actions/faq.actions.ts`); seed script (starter answers, switched off)
**Read by:** chatbot (`matchFaq` in `lib/rag/faq.ts`), before the AI is called

| Field | Type | Description |
|-------|------|-------------|
| `question` | `string` | The common question |
| `answer` | `string` | Shown to the employee word for word |
| `policyTitle` | `string?` | Shown as the source |
| `active` | `boolean` | `false` = kept on the page, not used by the chatbot |
| `embedding` | `vector(768)` | The question, embedded as `RETRIEVAL_QUERY` |
| `createdBy`, `createdAt`, `updatedBy`, `updatedAt` | | |
| `_schemaVersion` | `1` | |

**Index:** vector index on `embedding`, 768 dimensions, in `firebase/firestore.indexes.json`.

---

## `chatConversations` collection

**Path:** `/chatConversations/{autoId}`, with messages at `/chatConversations/{id}/messages/{autoId}`
**Written by:** `saveExchange` (`features/chatbot/lib/conversations.ts`), called by `sendChatMessage` after each answer. Never by the browser.
**Read by:** the Assistant page (`actions/conversation.actions.ts`) for the owner only, and `sendChatMessage` for follow-up questions.

| Field | Type | Description |
|-------|------|-------------|
| `ownerUid` | `string` | The employee the conversation belongs to. Checked on every request |
| `title` | `string` | Written by the model on the first answer, or the first question shortened; the employee can rename it |
| `description` | `string?` | One line: topics covered so far, updated by the model each answer |
| `topic` | `string?` | The last question's policy and subject, used to search follow-up questions |
| `messageCount` | `number` | Also the next message's `seq` |
| `summary` | `string?` | "Summarise everything so far": written by the AI, saved only after the employee approved the preview. Used instead of `description` as the conversation's key points |
| `summarisedAtCount` | `number?` | `messageCount` when the summary was saved |
| `pendingSummary` | `string?` | A summary preview waiting for approval; removed on Save or Discard |
| `createdAt`, `updatedAt` | `Timestamp` | |
| `_schemaVersion` | `1` | |

**Message fields:** `seq` (order), `role` (`user` or `assistant`), `text`, and for answers `kind`, `sources`, `fromFaq`. Errors are not saved.

**Privacy (pending the BA/PM's decision):** kept until the employee deletes the conversation; admins have no page for them.
