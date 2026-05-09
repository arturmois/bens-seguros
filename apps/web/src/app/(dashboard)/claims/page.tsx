import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'

import { ClaimsContent } from './claims-content'

export const metadata: Metadata = { title: 'Sinistros' }

export default function ClaimsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sinistros' },
        ]}
        title="Sinistros"
        description="Gerenciamento de sinistros e acompanhamento de ocorrências."
      />
      <ClaimsContent />
    </div>
  )
}
