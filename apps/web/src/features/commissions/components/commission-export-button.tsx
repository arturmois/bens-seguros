'use client'

import { Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { CommissionFilters } from '../types'
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
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Exportar CSV
    </Button>
  )
}
