import { Suspense } from 'react'
import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'

import { ProposalsContent } from './proposals-content'

export const metadata: Metadata = { title: 'Propostas' }

export default function ProposalsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Propostas' },
        ]}
        title="Propostas"
        description="Pipeline de propostas de seguro."
      />
      <Suspense>
        <ProposalsContent />
      </Suspense>
    </div>
  )
}
