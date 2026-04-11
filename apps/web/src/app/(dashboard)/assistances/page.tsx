import type { Metadata } from 'next'

import { PageBreadcrumb } from '@/components/page-breadcrumb'

import { AssistancesContent } from './assistances-content'

export const metadata: Metadata = { title: 'Assistências' }

export default function AssistancesPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Assistências' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Assistências
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerenciamento de assistências e acompanhamento de prestadores.
          </p>
        </div>
      </div>
      <AssistancesContent />
    </div>
  )
}
