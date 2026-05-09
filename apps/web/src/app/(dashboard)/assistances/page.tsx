import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'

import { AssistancesContent } from './assistances-content'

export const metadata: Metadata = { title: 'Assistências' }

export default function AssistancesPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Assistências' },
        ]}
        title="Assistências"
        description="Gerenciamento de assistências e acompanhamento de prestadores."
      />
      <AssistancesContent />
    </div>
  )
}
