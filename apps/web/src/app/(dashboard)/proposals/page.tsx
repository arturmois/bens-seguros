import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ListPageHeader } from '@/components/shared/list-page-header'
import { Button } from '@/components/ui/button'

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
        action={
          <Button render={<Link href="/proposals/new" />}>
            <Plus className="size-4" />
            Nova Proposta
          </Button>
        }
      />
      <ProposalsContent />
    </div>
  )
}
