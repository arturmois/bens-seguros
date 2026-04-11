import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'

import { CommissionsContent } from './commissions-content'

export const metadata: Metadata = { title: 'Comissões' }

export default function CommissionsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Comissões' },
        ]}
        title="Comissões"
        description="Gerenciamento de comissões e aprovações."
      />
      <CommissionsContent />
    </div>
  )
}
