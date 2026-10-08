import type { Metadata } from 'next'
import { requireAdmin } from '@/actions/auth.actions'
import { ChatWindow } from '@/features/chatbot/components/ChatWindow'

export const metadata: Metadata = { title: 'Admin Assistant' }

export default async function AdminAssistantPage() {
  await requireAdmin()
  return <ChatWindow />
}