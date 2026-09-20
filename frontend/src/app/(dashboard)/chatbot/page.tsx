import type { Metadata } from 'next'
import { requireAuth } from '@/actions/auth.actions'
import { PageHeader } from '@/components/layout/PageHeader'
import { ChatWindow } from '@/features/chatbot/components/ChatWindow'

export const metadata: Metadata = { title: 'Chatbot' }

export default async function ChatbotPage() {
  await requireAuth()
  return (
    <div className="space-y-6">
      <PageHeader title="Chatbot" description="Ask the assistant a question" />
      <ChatWindow />
    </div>
  )
}
