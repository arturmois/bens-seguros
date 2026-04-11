import type { Metadata } from 'next'

import { PageBreadcrumb } from '@/components/page-breadcrumb'

import { ProposalsContent } from './proposals-content'

export const metadata: Metadata = { title: 'Propostas' }

export default function ProposalsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Propostas' },
          ]}
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
          <p className="text-muted-foreground text-sm">
            Pipeline de propostas de seguro.
          </p>
        </div>
      </div>
      <ProposalsContent />
    </div>
  )
}
