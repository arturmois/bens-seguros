'use client'

import { Download, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { ListPoliciesParams } from '@/api/model'
import { Button } from '@/components/ui/button'
import { downloadCsvBlob } from '@/lib/csv-download'

interface PolicyExportButtonProps {
  readonly filters: ListPoliciesParams
}

export function PolicyExportButton({ filters }: PolicyExportButtonProps) {
  const exportCsv = useMutation({
    mutationFn: async (f: ListPoliciesParams) => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(f)) {
        if (value === undefined || value === null || value === '') continue
        params.set(key, String(value))
      }
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
