'use client'

import { useState } from 'react'
import { Columns3, List } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ProposalKanban } from '@/features/proposals/components/proposal-kanban'
import { ProposalsTable } from '@/features/proposals/components/proposals-table'

type ViewMode = 'table' | 'kanban'

export function ProposalsContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <div className="flex gap-1 rounded-md border p-0.5">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            aria-label="Visualização em tabela"
          >
            <List className="mr-1.5 h-4 w-4" />
            Tabela
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            aria-label="Visualização em kanban"
          >
            <Columns3 className="mr-1.5 h-4 w-4" />
            Kanban
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? <ProposalsTable /> : <ProposalKanban />}
    </div>
  )
}
