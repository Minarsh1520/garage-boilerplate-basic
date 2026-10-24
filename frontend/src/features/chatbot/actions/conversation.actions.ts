'use server'

import { z } from 'zod'
import { requireAuth } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import {
  approvePendingSummary,
  deleteConversation,
  discardPendingSummary,
  getOwnedConversation,
  listConversations,
  readMessages,
  renameConversation,
  setPendingSummary,
} from '@/features/chatbot/lib/conversations'
import { classifyError, StageError } from '@/features/chatbot/lib/errors'
import { writeSummary } from '@/features/chatbot/lib/summary'
import { getRagDeps } from '@/lib/rag/server'
import type { ConversationSummary, SavedMessage } from '@/features/chatbot/types'
import type { ActionResult } from '@/types'

// The conversation list and its controls. Every action checks that the conversation
// belongs to the signed-in employee; an id alone is never enough.
const idSchema = z.string().min(1).max(100)
const NOT_FOUND = 'That conversation could not be found.'

export async function getMyConversations(): Promise<ActionResult<ConversationSummary[]>> {
  const session = await requireAuth()
  try {
    return { success: true, data: await listConversations(adminDb, session.uid) }
  } catch (error) {
    console.error('[chat] conversation list failed', error)
    return { success: false, error: 'Your conversations could not be loaded.' }
  }
}

export async function openConversation(
  id: unknown
): Promise<ActionResult<{ title: string; summary?: string; summarisedAtCount?: number; messageCount: number; messages: SavedMessage[] }>> {
  const session = await requireAuth()
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { success: false, error: NOT_FOUND }
  const conversation = await getOwnedConversation(adminDb, session.uid, parsed.data)
  if (!conversation) return { success: false, error: NOT_FOUND }
  return {
    success: true,
    data: {
      title: conversation.title,
      summary: conversation.summary,
      summarisedAtCount: conversation.summarisedAtCount,
      messageCount: conversation.messageCount,
      messages: await readMessages(adminDb, conversation.id),
    },
  }
}

export async function renameMyConversation(id: unknown, title: unknown): Promise<ActionResult> {
  const session = await requireAuth()
  const parsed = z.object({ id: idSchema, title: z.string().trim().min(1, 'Please enter a name.').max(80) }).safeParse({ id, title })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Please enter a name.' }
  if (!(await getOwnedConversation(adminDb, session.uid, parsed.data.id))) return { success: false, error: NOT_FOUND }
  await renameConversation(adminDb, parsed.data.id, parsed.data.title)
  return { success: true }
}

export async function deleteMyConversation(id: unknown): Promise<ActionResult> {
  const session = await requireAuth()
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { success: false, error: NOT_FOUND }
  if (!(await getOwnedConversation(adminDb, session.uid, parsed.data))) return { success: false, error: NOT_FOUND }
  try {
    await deleteConversation(adminDb, parsed.data)
    return { success: true }
  } catch (error) {
    console.error('[chat] conversation delete failed', error)
    return { success: false, error: 'The conversation could not be deleted. Please try again.' }
  }
}

// ---- "Summarise everything so far" ----
// Step 1, after the employee has read what it costs and pressed "Create a summary": the AI
// writes a summary, which is kept as a PREVIEW. Nothing the Assistant uses changes yet.
export async function previewConversationSummary(id: unknown): Promise<ActionResult<{ summary: string }>> {
  const session = await requireAuth()
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { success: false, error: NOT_FOUND }
  const conversation = await getOwnedConversation(adminDb, session.uid, parsed.data)
  if (!conversation) return { success: false, error: NOT_FOUND }

  try {
    const messages = await readMessages(adminDb, conversation.id)
    if (messages.length < 2) return { success: false, error: 'There is nothing to summarise yet.' }
    const summary = await writeSummary(getRagDeps().ai, messages)
    await setPendingSummary(adminDb, conversation.id, summary)
    return { success: true, data: { summary } }
  } catch (error) {
    // Same codes and wording as chat errors, e.g. "usage limit" when every key is used up.
    const classified = classifyError(new StageError('generation', error))
    console.error(`[chat] ${classified.code} side=${classified.side} stage=summary`, error)
    return { success: false, error: `${classified.userMessage} (Ref: ${classified.code})` }
  }
}

// Step 2: the employee approved the preview. The SAVED preview is copied across, so the
// summary is always exactly the text they were shown.
export async function approveConversationSummary(id: unknown): Promise<ActionResult<{ summary: string }>> {
  const session = await requireAuth()
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { success: false, error: NOT_FOUND }
  const conversation = await getOwnedConversation(adminDb, session.uid, parsed.data)
  if (!conversation) return { success: false, error: NOT_FOUND }
  const summary = await approvePendingSummary(adminDb, conversation)
  return summary ? { success: true, data: { summary } } : { success: false, error: 'That summary is no longer available. Please create a new one.' }
}

export async function discardConversationSummary(id: unknown): Promise<ActionResult> {
  const session = await requireAuth()
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { success: false, error: NOT_FOUND }
  if (!(await getOwnedConversation(adminDb, session.uid, parsed.data))) return { success: false, error: NOT_FOUND }
  await discardPendingSummary(adminDb, parsed.data)
  return { success: true }
}

