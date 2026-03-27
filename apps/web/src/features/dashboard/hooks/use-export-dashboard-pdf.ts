'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api-client'

import type { DashboardPreset } from '../types'

interface ExportResponse {
  readonly url: string
}

export function useExportDashboardPdf() {
  return useMutation({
    mutationFn: async (preset: DashboardPreset) => {
      const response = await api.post<ExportResponse>(
        `/api/v1/stats/dashboard/pdf?preset=${preset}`,
        {}
      )
      return response.data
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank')
      toast.success('Relatorio gerado com sucesso')
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message)
        return
      }
      toast.error('Erro ao gerar relatorio')
    },
  })
}
