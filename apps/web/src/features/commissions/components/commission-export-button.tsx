'use client'

import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { CommissionFilters } from '../lib/types'
import { useExportCommissionsCsv } from '../hooks/use-commissions'

interface CommissionExportButtonProps {
  readonly filters: CommissionFilters
}

export function CommissionExportButton({
  filters,
}: CommissionExportButtonProps) {
  const exportCsv = useExportCommissionsCsv()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportCsv.mutate(filters)}
      disabled={exportCsv.isPending}
      aria-label="Exportar comissões em CSV"
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
