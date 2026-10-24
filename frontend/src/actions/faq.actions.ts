'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import { deleteFaq, faqInputSchema, listFaqs, saveFaq, setFaqActive, type FaqListItem } from '@/lib/rag/faq'
import { getRagDeps } from '@/lib/rag/server'
import type { ActionResult } from '@/types'

// Admin-only: every action checks the role on the server. Hiding the page link is not enough.
const idSchema = z.string().min(1).max(200)

export async function getFaqs(): Promise<FaqListItem[]> {
  await requireAdmin()
  return listFaqs({ db: adminDb })
}

// Create when there is no id, edit when there is one. Saving calls the embedding model
// once (to match employee questions against it), so it can hit the usage limit.
export async function saveFaqAnswer(input: unknown, id?: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdmin()

  const parsed = faqInputSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
  const parsedId = id === undefined ? undefined : idSchema.safeParse(id)
  if (parsedId && !parsedId.success) return { success: false, error: 'That answer could not be found.' }

  try {
    const savedId = await saveFaq(getRagDeps(), { ...parsed.data, id: parsedId?.data, savedBy: session.uid })
    revalidatePath('/admin/faq')
    return { success: true, data: { id: savedId } }
  } catch (error) {
    console.error('[faq] save failed', error)
    return { success: false, error: 'The answer could not be saved. Please try again.' }
  }
}

export async function toggleFaqAnswer(id: unknown, active: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = z.object({ id: idSchema, active: z.boolean() }).safeParse({ id, active })
  if (!parsed.success) return { success: false, error: 'That answer could not be found.' }
  try {
    await setFaqActive({ db: adminDb }, parsed.data.id, parsed.data.active)
    revalidatePath('/admin/faq')
    return { success: true }
  } catch (error) {
    console.error('[faq] toggle failed', error)
    return { success: false, error: 'The change could not be saved. Please try again.' }
  }
}

export async function deleteFaqAnswer(id: unknown): Promise<ActionResult> {
  await requireAdmin()
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { success: false, error: 'That answer could not be found.' }
  try {
    await deleteFaq({ db: adminDb }, parsed.data)
    revalidatePath('/admin/faq')
    return { success: true }
  } catch (error) {
    console.error('[faq] delete failed', error)
    return { success: false, error: 'The answer could not be deleted. Please try again.' }
  }
}
