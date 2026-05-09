'use client'

import { Download, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { downloadCsvBlob } from '@/lib/csv-download'

import type { PolicyStatus } from '../lib/types'

interface PolicyExportFilters {
  readonly status?: PolicyStatus
  readonly clientId?: string
  readonly proposalId?: string
  readonly branch?: string
  readonly search?: string
}

interface PolicyExportButtonProps {
  readonly filters: PolicyExportFilters
}

export function PolicyExportButton({ filters }: PolicyExportButtonProps) {
  const exportCsv = useMutation({
    mutationFn: async (f: PolicyExportFilters) => {
      const params = new URLSearchParams()
      if (f.status) params.set('status', f.status)
      if (f.clientId) params.set('clientId', f.clientId)
      if (f.proposalId) params.set('proposalId', f.proposalId)
      if (f.branch) params.set('branch', f.branch)
      if (f.search) params.set('search', f.search)
      await downloadCsvBlob(
        `/api/v1/policies/export?${params.toString()}`,
        'apolices.csv'
      )
    },
    onSuccess: () => toast.success('Exportação concluída'),
    onError: () => toast.error('Erro ao exportar apólices'),
  })

  return (
    <Button
      variant="outline"
      onClick={() => exportCsv.mutate(filters)}
      disabled={exportCsv.isPending}
      aria-label="Exportar apólices em CSV"
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
