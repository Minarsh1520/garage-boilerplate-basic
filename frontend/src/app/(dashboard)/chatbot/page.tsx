import type { Metadata } from 'next'
import { requireAuth } from '@/actions/auth.actions'
import { ChatWindow } from '@/features/chatbot/components/ChatWindow'

export const metadata: Metadata = { title: 'Assistant' }

export default async function ChatbotPage() {
  await requireAuth()

  return <ChatWindow />
}