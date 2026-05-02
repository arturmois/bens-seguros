'use client'

import { Download, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { downloadCsvBlob } from '@/lib/csv-download'

import type { ClientFilters } from '../lib/types'

interface ClientExportButtonProps {
  readonly filters: ClientFilters
}

export function ClientExportButton({ filters }: ClientExportButtonProps) {
  const exportCsv = useMutation({
    mutationFn: async (f: ClientFilters) => {
      const params = new URLSearchParams()
      if (f.search) params.set('search', f.search)
      if (typeof f.hasActivePolicy === 'boolean') {
        params.set('hasActivePolicy', String(f.hasActivePolicy))
      }
      await downloadCsvBlob(
        `/api/v1/clients/export?${params.toString()}`,
        'clientes.csv'
      )
    },
    onSuccess: () => toast.success('Exportação concluída'),
    onError: () => toast.error('Erro ao exportar clientes'),
  })

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportCsv.mutate(filters)}
      disabled={exportCsv.isPending}
      aria-label="Exportar clientes em CSV"
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
