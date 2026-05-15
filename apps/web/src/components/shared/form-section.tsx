import type { ReactNode } from 'react'

interface FormSectionProps {
  readonly title?: string
  readonly description?: string
  readonly actions?: ReactNode
  readonly children: ReactNode
}

export function FormSection({
  title,
  description,
  actions,
  children,
}: FormSectionProps) {
  return (
    <section className="space-y-4">
      {title && (
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            {description && (
              <p className="text-muted-foreground text-sm">{description}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}
