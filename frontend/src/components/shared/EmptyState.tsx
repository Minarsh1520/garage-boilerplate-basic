import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F1F8]">
        <Icon className="h-6 w-6 text-[#4361AB]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#222222]">{title}</p>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
