'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getGenerateProposalPdfUrl } from '@/api/endpoints/proposals/proposals'
import { api, ApiError } from '@/lib/api-client'

interface PdfResponse {
  url: string
}

export function useGenerateProposalPdf(proposalId: string) {
  return useMutation({
    mutationFn: () =>
      api.post<PdfResponse>(getGenerateProposalPdfUrl(proposalId), {}),
    onSuccess: (response) => {
      window.open(response.data.url, '_blank')
      toast.success('PDF gerado com sucesso!')
    },
    onError: (error) => {
      const message =
        error instanceof ApiError ? error.message : 'Erro ao gerar PDF.'
      toast.error(message)
    },
  })
}
