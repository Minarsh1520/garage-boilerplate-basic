import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { AssistantReply, ConversationSummary, SavedMessage } from '../types'

// Saved chat conversations. Written ONLY by the server (Server Actions, Admin SDK): the
// browser sends a question and a conversation id, never the history itself. That is what
// lets the assistant safely re-read its own earlier answers for follow-up questions.
//
//   chatConversations/{id}                 one per conversation, owned by one employee
//   chatConversations/{id}/messages/{id}   the questions and answers, ordered by `seq`
//
// Privacy (pending the BA/PM's decision on retention): only the owner can list, open,
// rename or delete a conversation; admins have no page for them. Escalation cases are
// still the only way a person sees an employee's question.
export const CONVERSATION_COLLECTION = 'chatConversations'
const MESSAGES = 'messages'

// How many earlier messages are read back for each new question. The assistant sees the
// last two exchanges plus the conversation's key points, so its cost stays flat however
// long the conversation gets.
export const RECENT_MESSAGES_READ = 6
const MAX_LISTED = 50
const TITLE_MAX = 80

export interface ConversationRecord {
    id: string
    ownerUid: string
    title: string
    description?: string
    topic?: string
    summary?: string
    summarisedAtCount?: number
    pendingSummary?: string // written by the AI, waiting for the employee to approve it
    messageCount: number
}

const iso = (value: unknown) =>
    value && typeof value === 'object' && 'toDate' in value ? (value as { toDate(): Date }).toDate().toISOString() : undefined

// The conversation, only if it belongs to `uid`. Anyone else gets null, exactly as if it
// didn't exist, so an id can't be used to find out about someone else's chats.
export async function getOwnedConversation(db: Firestore, uid: string, id: string): Promise<ConversationRecord | null> {
    const snap = await db.collection(CONVERSATION_COLLECTION).doc(id).get()
    const data = snap.data()
    if (!snap.exists || !data || data.ownerUid !== uid) return null
    return {
        id: snap.id,
        ownerUid: data.ownerUid,
        title: String(data.title ?? 'Conversation'),
        description: typeof data.description === 'string' ? data.description : undefined,
        topic: typeof data.topic === 'string' ? data.topic : undefined,
        summary: typeof data.summary === 'string' ? data.summary : undefined,
        summarisedAtCount: typeof data.summarisedAtCount === 'number' ? data.summarisedAtCount : undefined,
        pendingSummary: typeof data.pendingSummary === 'string' ? data.pendingSummary : undefined,
        messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
    }
}

function toSavedMessage(id: string, data: FirebaseFirestore.DocumentData): SavedMessage {
    return {
        id,
        role: data.role === 'user' ? 'user' : 'assistant',
        text: String(data.text ?? ''),
        kind: data.kind,
        sources: Array.isArray(data.sources) ? data.sources : undefined,
        fromFaq: data.fromFaq === true || undefined,
        createdAt: iso(data.createdAt),
    }
}

// Ordered by `seq` (a running number), not by time: a question and its answer are saved in
// the same instant, so their timestamps can't tell which came first.
export async function readMessages(db: Firestore, conversationId: string, options: { last?: number } = {}): Promise<SavedMessage[]> {
    const messages = db.collection(CONVERSATION_COLLECTION).doc(conversationId).collection(MESSAGES)
    const query = options.last ? messages.orderBy('seq', 'desc').limit(options.last) : messages.orderBy('seq', 'asc')
    const snapshot = await query.get()
    const list = snapshot.docs.map((doc) => toSavedMessage(doc.id, doc.data()))
    return options.last ? list.reverse() : list
}

// Question/answer pairs from saved messages, oldest first. A question whose answer was
// not saved (an error) has no pair and is skipped.
export function toExchanges(messages: SavedMessage[], limit = 2): { question: string; answer: string }[] {
    const pairs: { question: string; answer: string }[] = []
    messages.forEach((message, i) => {
        const next = messages[i + 1]
        if (message.role === 'user' && next?.role === 'assistant') pairs.push({ question: message.text, answer: next.text })
    })
    return pairs.slice(-limit)
}

// A title that never needs the AI: the first question, shortened. Used when the model gave
// no title (a stored answer, a cached answer) and as a safe stand-in for sensitive matters,
// whose wording shouldn't sit in a list someone else might see on the employee's screen.
export function fallbackTitle(question: string, reply: Pick<AssistantReply, 'kind'>): string {
    if (reply.kind === 'escalate') return 'Question for a person'
    const oneLine = question.replace(/\s+/g, ' ').trim()
    return oneLine.length <= 60 ? oneLine : `${oneLine.slice(0, 57).trimEnd()}...`
}

// Saves one question and its answer, creating the conversation on its first question.
// One batch: the conversation never shows a question without its answer.
export async function saveExchange(
    db: Firestore,
    input: {
        uid: string
        conversation: ConversationRecord | null // null = start a new conversation
        question: string
        reply: AssistantReply
    }
): Promise<{ conversationId: string; title: string; assistantMessageId: string }> {
    const { conversation, reply } = input
    const ref = conversation ? db.collection(CONVERSATION_COLLECTION).doc(conversation.id) : db.collection(CONVERSATION_COLLECTION).doc()
    const seq = conversation?.messageCount ?? 0
    const title = conversation?.title ?? (reply.memory?.title || fallbackTitle(input.question, reply)).slice(0, TITLE_MAX)

    const batch = db.batch()
    const userRef = ref.collection(MESSAGES).doc()
    const assistantRef = ref.collection(MESSAGES).doc()
    batch.set(userRef, { seq, role: 'user', text: input.question, createdAt: FieldValue.serverTimestamp() })
    batch.set(assistantRef, {
        seq: seq + 1,
        role: 'assistant',
        text: reply.text,
        kind: reply.kind,
        sources: reply.sources,
        ...(reply.fromFaq ? { fromFaq: true } : {}),
        createdAt: FieldValue.serverTimestamp(),
    })

    // The memory fields replace the old ones only when the model returned them, so a stored
    // answer (no model call) keeps the conversation's existing description and topic.
    const memory = {
        ...(reply.memory?.description ? { description: reply.memory.description.slice(0, 300) } : {}),
        ...(reply.memory?.topic ? { topic: reply.memory.topic.slice(0, 120) } : {}),
    }
    if (conversation) {
        batch.update(ref, { ...memory, messageCount: FieldValue.increment(2), updatedAt: FieldValue.serverTimestamp() })
    } else {
        batch.set(ref, {
            ownerUid: input.uid,
            title,
            ...memory,
            messageCount: 2,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            _schemaVersion: 1,
        })
    }
    await batch.commit()
    return { conversationId: ref.id, title, assistantMessageId: assistantRef.id }
}

// The employee's own conversations, newest first. Filtered on the owner only and sorted
// here in code: sorting in the query as well would need an extra composite index, and one
// employee has a few dozen conversations at most.
export async function listConversations(db: Firestore, uid: string): Promise<ConversationSummary[]> {
    const snapshot = await db
        .collection(CONVERSATION_COLLECTION)
        .where('ownerUid', '==', uid)
        .select('title', 'description', 'updatedAt', 'messageCount')
        .get()
    return snapshot.docs
        .map((doc) => {
            const data = doc.data()
            return {
                id: doc.id,
                title: String(data.title ?? 'Conversation'),
                description: typeof data.description === 'string' ? data.description : undefined,
                updatedAt: iso(data.updatedAt),
                messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
            }
        })
        .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
        .slice(0, MAX_LISTED)
}

export async function renameConversation(db: Firestore, id: string, title: string) {
    await db.collection(CONVERSATION_COLLECTION).doc(id).update({ title: title.slice(0, TITLE_MAX), updatedAt: FieldValue.serverTimestamp() })
}

// Deletes the messages first, in batches (Firestore allows 500 writes per batch), then the
// conversation itself, so a half-finished delete never leaves an empty-looking chat behind.
export async function deleteConversation(db: Firestore, id: string) {
    const ref = db.collection(CONVERSATION_COLLECTION).doc(id)
    const messages = await ref.collection(MESSAGES).select().get()
    for (let i = 0; i < messages.docs.length; i += 450) {
        const batch = db.batch()
        messages.docs.slice(i, i + 450).forEach((doc) => batch.delete(doc.ref))
        await batch.commit()
    }
    await ref.delete()
}

// ---- Summaries (preview first, saved only on approval) ----
// The AI's summary is kept as `pendingSummary` until the employee approves it. Approval
// copies THAT text across, so what gets saved is always exactly what they were shown,
// and never text sent from the browser.
export async function setPendingSummary(db: Firestore, id: string, summary: string) {
    await db.collection(CONVERSATION_COLLECTION).doc(id).update({ pendingSummary: summary, pendingSummaryAt: FieldValue.serverTimestamp() })
}

export async function approvePendingSummary(db: Firestore, conversation: ConversationRecord): Promise<string | null> {
    if (!conversation.pendingSummary) return null
    await db.collection(CONVERSATION_COLLECTION).doc(conversation.id).update({
        summary: conversation.pendingSummary,
        summarisedAtCount: conversation.messageCount,
        summaryUpdatedAt: FieldValue.serverTimestamp(),
        pendingSummary: FieldValue.delete(),
        pendingSummaryAt: FieldValue.delete(),
    })
    return conversation.pendingSummary
}

export async function discardPendingSummary(db: Firestore, id: string) {
    await db.collection(CONVERSATION_COLLECTION).doc(id).update({ pendingSummary: FieldValue.delete(), pendingSummaryAt: FieldValue.delete() })
}

