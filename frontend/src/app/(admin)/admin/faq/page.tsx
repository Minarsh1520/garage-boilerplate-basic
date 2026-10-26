import { getFaqs } from '@/actions/faq.actions'
import { FaqManager } from '@/features/faq/components/FaqManager'

// Server component: the list is read on the server (admin check included), then handed
// to the client component that does the editing.
export default async function FaqPage() {
  const faqs = await getFaqs()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-[#222222]">Stored Answers</h1>
      <p className="mt-1 text-sm text-[#222222]">
        Approved answers to common questions. The assistant shows these word for word when a question closely matches.
        Anything else is answered by the AI from the uploaded policies.
      </p>
      <FaqManager faqs={faqs} />
    </div>
  )
}
