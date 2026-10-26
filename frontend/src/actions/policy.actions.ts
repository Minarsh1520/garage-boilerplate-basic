'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { readPolicyFile } from '@/lib/rag/policy-file'
import { policyFormSchema, type PolicyForm } from '@/lib/rag/policy-sources'
import { deletePolicy, listPolicies, publishPolicy, readPolicyForm, type PolicyListItem } from '@/lib/rag/publish'
import { getRagDeps } from '@/lib/rag/server'
import type { ActionResult } from '@/types'

// Replaces uploadPolicyDocument(). The old version saved the PDF file in Firestore, but
// nothing read it, so uploaded policies never reached the chatbot. Now:
//   file (Word, PDF or text) → previewPolicyFile() → the admin checks the form → publishPolicyForm()
//   typed in                 → publishPolicyForm()
// Only publishPolicyForm() changes what the chatbot knows.

const MAX_FILE_SIZE = 500 * 1024
const idSchema = z.string().min(1).max(200)

// Step 1 for a file: read it and check it follows the policy layout (see
// POLICY_LAYOUT_RULES). Nothing is saved yet. A file that doesn't follow the layout is
// rejected with the list of problems, so the admin can fix the file and try again.
export async function previewPolicyFile(fileName: unknown, fileData: unknown): Promise<ActionResult<PolicyForm>> {
  await requireAdmin()

  const parsed = z.object({ fileName: z.string().min(1).max(200), fileData: z.string().min(1) }).safeParse({ fileName, fileData })
  if (!parsed.success) return { success: false, error: 'No file was provided.' }

  // The browser sends a data URL ("data:...;base64,...."). Only the part after the comma is the file.
  const bytes = new Uint8Array(Buffer.from(parsed.data.fileData.split(',').pop() ?? '', 'base64'))
  if (bytes.length > MAX_FILE_SIZE) return { success: false, error: 'The file must be 500 KB or smaller.' }

  try {
    const result = await readPolicyFile(parsed.data.fileName, bytes)
    if (result.ok) return { success: true, data: result.form }
    // One problem per line; the Policy page shows them as a list.
    // A file problem (wrong type, no text) is one message; layout problems are a list.
    if (result.kind === 'file') return { success: false, error: result.problems.join('\n') }
    return { success: false, error: ['This file doesn’t follow the policy layout:', ...result.problems.map((p) => `• ${p}`)].join('\n') }
  } catch (error) {
    console.error('[policy] file read failed', error)
    return { success: false, error: 'This file could not be read. It may be damaged or password-protected.' }
  }
}

// Step 2 (both routes): publish the checked form to the chatbot.
//   new policy            fails with "exists" if the title is already in use, so the page can
//                         ask "Replace it?", then calls again with replace: true
//   edit (editingPolicyId) fails with "conflict" if someone published since the admin opened it
const publishInputSchema = z.object({
  form: z.unknown(),
  source: z.enum(['file', 'form']).catch('form'),
  fileName: z.string().max(200).optional().catch(undefined),
  editingPolicyId: z.string().min(1).max(200).optional().catch(undefined),
  expectedVersion: z.number().int().min(0).optional().catch(undefined),
  replace: z.boolean().optional().catch(undefined),
})

export interface PublishOutcome {
  outcome: 'published' | 'exists' | 'conflict'
  policyId: string
  chunkCount?: number
  existingTitle?: string
  existingUpdatedAt?: string
}

export async function publishPolicyForm(input: unknown): Promise<ActionResult<PublishOutcome>> {
  const session = await requireAdmin()

  const request = publishInputSchema.safeParse(input)
  if (!request.success) return { success: false, error: 'Please check the form.' }
  const parsed = policyFormSchema.safeParse(request.data.form)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
  const { source, fileName, editingPolicyId, expectedVersion, replace } = request.data

  try {
    const result = await publishPolicy(getRagDeps(), {
      form: parsed.data,
      source,
      fileName,
      uid: session.uid,
      policyId: editingPolicyId,
      mode: editingPolicyId ? 'edit' : replace ? 'replace' : 'new',
      expectedVersion,
    })
    revalidatePath('/admin/policy')
    switch (result.status) {
      case 'ready':
        return { success: true, data: { outcome: 'published', policyId: result.policyId, chunkCount: result.chunkCount } }
      case 'exists':
        return {
          success: true,
          data: { outcome: 'exists', policyId: result.policyId, existingTitle: result.existingTitle, existingUpdatedAt: result.existingUpdatedAt },
        }
      case 'conflict':
        return { success: true, data: { outcome: 'conflict', policyId: result.policyId } }
      case 'failed':
        return { success: false, error: 'The policy could not be published. The previous version (if any) is still in use. Please try again.' }
    }
  } catch (error) {
    console.error('[policy] publish failed', error)
    return { success: false, error: 'The policy could not be published. Please try again.' }
  }
}

export async function getPolicies(): Promise<PolicyListItem[]> {
  await requireAdmin()
  return listPolicies({ db: adminDb })
}

// The form and its version: the version is sent back on publish, so a change someone else
// published in the meantime is caught instead of silently overwritten.
export async function getPolicyForm(policyId: unknown): Promise<ActionResult<{ form: PolicyForm; version: number }>> {
  await requireAdmin()
  const parsed = idSchema.safeParse(policyId)
  if (!parsed.success) return { success: false, error: 'That policy could not be found.' }
  const saved = await readPolicyForm({ db: adminDb }, parsed.data)
  return saved ? { success: true, data: saved } : { success: false, error: 'This policy has no saved form to edit. Please upload it again.' }
}

export async function removePolicy(policyId: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = idSchema.safeParse(policyId)
  if (!parsed.success) return { success: false, error: 'That policy could not be found.' }
  try {
    await deletePolicy({ db: adminDb }, parsed.data)
    revalidatePath('/admin/policy')
    return { success: true }
  } catch (error) {
    console.error('[policy] delete failed', error)
    return { success: false, error: 'The policy could not be removed. Please try again.' }
  }
}
