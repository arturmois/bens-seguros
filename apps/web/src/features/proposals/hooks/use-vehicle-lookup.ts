'use client'

import { toast } from 'sonner'

import { useLookupVehicle } from '@/api/endpoints/vehicles/vehicles'
import { ApiError } from '@/lib/api-client'

export function useVehicleLookup() {
  return useLookupVehicle({
    mutation: {
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          if (err.code === 'PLATE_NOT_FOUND') {
            toast.warning(
              'Placa não encontrada. Verifique o número ou digite os dados manualmente.'
            )
            return
          }
          if (err.code === 'PROVIDER_UNAVAILABLE') {
            toast.error(
              'Serviço de consulta indisponível. Preencha manualmente.'
            )
            return
          }
        }
        toast.error('Erro ao consultar veículo. Preencha manualmente.')
      },
    },
  })
}
