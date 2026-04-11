import type { ReactNode } from 'react'

import {
  PageBreadcrumb,
  type BreadcrumbItem,
} from '@/components/page-breadcrumb'

interface ListPageHeaderProps {
  readonly breadcrumb: readonly BreadcrumbItem[]
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
}

export function ListPageHeader({
  breadcrumb,
  title,
  description,
  action,
}: ListPageHeaderProps) {
  return (
    <div className="space-y-4">
      <PageBreadcrumb items={breadcrumb} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
