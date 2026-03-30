'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api-client'
import { getExportDashboardPdfUrl } from '@/api/endpoints/stats/stats'

import type { DashboardPreset } from '../lib/constants'

interface ExportResponse {
  readonly url: string
}

/**
 * PDF export stays manual because it uses window.open on the response URL.
 */
export function useExportDashboardPdf() {
  return useMutation({
    mutationFn: async (preset: DashboardPreset) => {
      const response = await api.post<ExportResponse>(
        getExportDashboardPdfUrl({ preset }),
        {}
      )
      return response.data
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank')
      toast.success('Relatório gerado com sucesso')
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message)
        return
      }
      toast.error('Erro ao gerar relatório')
    },
  })
}
