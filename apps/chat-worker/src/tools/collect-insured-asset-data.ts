import { env } from '@repo/env'
import { insuredObjectDetailsSchema, signRequest } from '@repo/shared'
import { tool } from 'ai'
import pino from 'pino'
import { z } from 'zod'

const logger = pino({ name: 'collect-insured-asset-data-tool' })

const FETCH_TIMEOUT_MS = 10_000

export function createCollectInsuredAssetDataTool(tenantId: string) {
  return tool({
    description:
      'Registra os dados do bem segurado na proposta. Chame APENAS depois que captureLead retornar um proposalId. Os campos obrigatórios variam por branch.',
    parameters: z.object({
      proposalId: z
        .string()
        .min(1)
        .describe('ID da proposta retornado por captureLead'),
      details: insuredObjectDetailsSchema.describe(
        'Dados do bem segurado. O campo branch determina os campos obrigatórios.'
      ),
    }),
    execute: async ({ proposalId, details }) => {
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
          details,
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
