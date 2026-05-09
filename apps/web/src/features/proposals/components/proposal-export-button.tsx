'use client'

import { Download, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { downloadCsvBlob } from '@/lib/csv-download'

import type { ProposalStage, BoardType } from '../lib/constants'

interface ProposalExportFilters {
  readonly stage?: ProposalStage
  readonly clientId?: string
  readonly boardType?: BoardType
  readonly search?: string
}

interface ProposalExportButtonProps {
  readonly filters: ProposalExportFilters
}

export function ProposalExportButton({ filters }: ProposalExportButtonProps) {
  const exportCsv = useMutation({
    mutationFn: async (f: ProposalExportFilters) => {
      const params = new URLSearchParams()
      if (f.stage) params.set('stage', f.stage)
      if (f.clientId) params.set('clientId', f.clientId)
      if (f.boardType) params.set('boardType', f.boardType)
      if (f.search) params.set('search', f.search)
      await downloadCsvBlob(
        `/api/v1/proposals/export?${params.toString()}`,
        'propostas.csv'
      )
    },
    onSuccess: () => toast.success('Exportação concluída'),
    onError: () => toast.error('Erro ao exportar propostas'),
  })

  return (
    <Button
      variant="outline"
      onClick={() => exportCsv.mutate(filters)}
      disabled={exportCsv.isPending}
      aria-label="Exportar propostas em CSV"
    >
      {exportCsv.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
      ) : (
        <Download className="h-4 w-4 sm:mr-2" />
      )}
      <span className="hidden sm:inline">Exportar CSV</span>
    </Button>
  )
}
