'use client'

import { Download, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { downloadCsvBlob } from '@/lib/csv-download'

import type { PolicyStatus } from '../lib/constants'

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
      size="sm"
      onClick={() => exportCsv.mutate(filters)}
      disabled={exportCsv.isPending}
      aria-label="Exportar apólices em CSV"
    >
      {exportCsv.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Exportar CSV
    </Button>
  )
}
