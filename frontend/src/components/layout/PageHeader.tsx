import { ui } from '@/lib/theme'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

// The standard page heading: large dark title, short description underneath.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className={ui.pageTitle}>{title}</h1>
        {description && <p className={ui.pageDescription}>{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
