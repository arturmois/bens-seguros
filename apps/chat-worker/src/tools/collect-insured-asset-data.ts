import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'

const logger = pino({ name: 'collect-insured-asset-data-tool' })

const FETCH_TIMEOUT_MS = 10_000

export function createCollectInsuredAssetDataTool(tenantId: string) {
  return tool({
    description:
      'Registra os dados do bem segurado na proposta (veículo, imóvel, vida, etc.). Use após criar a proposta para completar os detalhes do objeto de seguro.',
    parameters: z.object({
      proposalId: z.string().describe('ID da proposta a ser atualizada'),
      insuranceType: z
        .enum([
          'AUTO',
          'RESIDENTIAL',
          'LIFE',
          'BUSINESS',
          'CONDOMINIUM',
          'TRAVEL',
        ])
        .describe('Tipo de seguro'),
      data: z.record(z.unknown()).describe('Dados específicos do bem segurado'),
    }),
    execute: async ({ proposalId, insuranceType, data }) => {
      if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) {
        logger.warn(
          { tenantId },
          'Internal API not configured, skipping insured asset data collection'
        )
        return {
          success: false,
          message: 'Internal API not configured',
        }
      }

      try {
        const path = `/api/internal/proposals/${proposalId}/details`
        const body = JSON.stringify({
          details: { branch: insuranceType, ...data },
          premiumValueInCents: 0,
          commissionBasisPoints: 0,
        })
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = signRequest({
          secret: env.INTERNAL_API_SECRET,
          method: 'PUT',
          path,
          tenantId,
          body,
          timestamp,
        })

        const response = await fetch(`${env.INTERNAL_API_URL}${path}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Signature': signature,
            'X-Timestamp': String(timestamp),
            'X-Tenant-Id': tenantId,
          },
          body,
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })

        if (!response.ok) {
          logger.error(
            { status: response.status, tenantId, proposalId },
            'Failed to update proposal details via internal API'
          )
          return {
            success: false,
            message: `API responded with status ${String(response.status)}`,
          }
        }

        const json: unknown = await response.json()

        if (
          typeof json === 'object' &&
          json !== null &&
          'data' in json &&
          typeof (json as { data: unknown }).data === 'object' &&
          (json as { data: unknown }).data !== null
        ) {
          const responseData = (
            json as { data: { success: boolean; message: string } }
          ).data
          return {
            success: responseData.success,
            message: responseData.message,
          }
        }

        return { success: true, message: 'Detalhes da proposta atualizados' }
      } catch (err: unknown) {
        logger.error(
          { err, tenantId, proposalId },
          'Error calling internal API for proposal details update'
        )
        return {
          success: false,
          message: 'Failed to update proposal details',
        }
      }
    },
  })
}
