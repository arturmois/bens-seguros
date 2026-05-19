import type { ReactNode } from 'react'

import {
  PageBreadcrumb,
  type BreadcrumbItem,
} from '@/components/page-breadcrumb'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface FormPageShellProps {
  readonly breadcrumb: readonly BreadcrumbItem[]
  readonly title: string
  readonly description?: string
  readonly cardTitle: string
  readonly cardDescription?: string
  readonly children: ReactNode
}

export function FormPageShell({
  breadcrumb,
  title,
  description,
  cardTitle,
  cardDescription,
  children,
}: FormPageShellProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageBreadcrumb items={breadcrumb} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
          {cardDescription && (
            <CardDescription>{cardDescription}</CardDescription>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
