import { getEscalationCases } from '@/actions/escalation.actions'

export default async function CasesPage() {
  const cases = await getEscalationCases()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-[#222222]">
        Escalation Cases
      </h1>

      <p className="mt-1 text-sm text-[#222222]">
        View matters that require human assistance that the assistant couldn&apos;t resolve
      </p>

      <div className="mt-6 w-full">
        {cases.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-4">
            <p className="text-sm text-gray-600">
              No escalation cases.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="border-b border-gray-300 pb-4"
              >
                <div className="flex w-full items-start justify-between gap-4">
                  <h2 className="text-lg font-bold text-[#222222]">
                    {caseItem.type && (
                      <span className="text-[#4361AB]">
                        [{caseItem.type}]
                      </span>
                    )}{' '}
                    {caseItem.title ?? 'Untitled case'}
                  </h2>

                  {caseItem.status && (
                    <span className="text-xs font-semibold uppercase text-[#4361AB]">
                      {caseItem.status}
                    </span>
                  )}
                </div>

                {(caseItem.employeeName || caseItem.employeeId) && (
                  <p className="mt-1 text-sm font-semibold text-[#222222]">
                    {caseItem.employeeName ?? 'Unknown employee'}
                    {caseItem.employeeId
                      ? `, ${caseItem.employeeId}`
                      : ''}
                  </p>
                )}

                {caseItem.summary && (
                  <p className="mt-1 text-sm text-[#222222]">
                    {caseItem.summary}
                  </p>
                )}

                {caseItem.createdAt && (
                  <p className="mt-2 w-full text-right text-xs text-gray-500">
                    {new Date(caseItem.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}