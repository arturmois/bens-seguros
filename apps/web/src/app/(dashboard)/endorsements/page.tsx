import type { Metadata } from 'next'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { EndorsementsContent } from '@/features/endorsements/components/endorsements-content'

export const metadata: Metadata = { title: 'Endossos' }

export default function EndorsementsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <ListPageHeader
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Endossos' },
        ]}
        title="Endossos"
        description="Pipeline operacional de endossos vinculados a apólices em vigor."
      />
      <EndorsementsContent />
    </div>
  )
}
