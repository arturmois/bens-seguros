import type { Metadata } from 'next'

import { PageBreadcrumb } from '@/components/page-breadcrumb'

import { ClaimsContent } from './claims-content'

export const metadata: Metadata = { title: 'Sinistros' }

export default function ClaimsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Sinistros' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sinistros</h1>
          <p className="text-muted-foreground text-sm">
            Gerenciamento de sinistros e acompanhamento de ocorrências.
          </p>
        </div>
      </div>
      <ClaimsContent />
    </div>
  )
}
