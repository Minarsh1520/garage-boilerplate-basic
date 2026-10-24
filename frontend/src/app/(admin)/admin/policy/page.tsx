import { getPolicies } from '@/actions/policy.actions'
import { PolicyManager } from '@/features/policy/components/PolicyManager'

// Server component: reads the published list (admin check included), then hands it to
// the client component that does the uploading, checking and publishing.
export default async function PolicyPage() {
  const policies = await getPolicies()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-[#222222]">Policy</h1>
      <p className="mt-1 text-sm text-[#222222]">Provide approved documents for the AI assistant to use</p>
      <PolicyManager policies={policies} />
    </div>
  )
}
