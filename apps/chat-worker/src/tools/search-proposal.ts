import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'

const logger = pino({ name: 'search-proposal-tool' })

const FETCH_TIMEOUT_MS = 10_000

export function createSearchProposalTool(tenantId: string) {
  return tool({
    description:
      'Consulta propostas de seguro existentes de um cliente. Use para verificar status de cotações em andamento ou histórico.',
    parameters: z.object({
      clientId: z.string().optional().describe('ID do cliente'),
      phone: z.string().optional().describe('Telefone do cliente para busca'),
      status: z
        .enum(['ACTIVE', 'LOST', 'ALL'])
        .optional()
        .default('ACTIVE')
        .describe(
          'Filtro de status: ACTIVE (em andamento), LOST (perdidas), ALL (todas)'
        ),
    }),
    execute: async ({ clientId, phone, status }) => {
      if (!clientId && !phone) {
        return {
          proposals: [],
          total: 0,
          error: 'clientId or phone is required',
        }
      }

      if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) {
        logger.warn(
          { tenantId },
          'Internal API not configured, skipping proposal search'
        )
        return { proposals: [], total: 0, error: 'Internal API not configured' }
      }

      try {
        const params = new URLSearchParams()
        if (clientId) params.set('clientId', clientId)
        if (phone) params.set('phone', phone)
        if (status) params.set('status', status)

        const path = '/api/internal/proposals'
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = signRequest({
          secret: env.INTERNAL_API_SECRET,
          method: 'GET',
          path,
          tenantId,
          body: '',
          timestamp,
        })

        const response = await fetch(
          `${env.INTERNAL_API_URL}${path}?${params.toString()}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Signature': signature,
              'X-Timestamp': String(timestamp),
              'X-Tenant-Id': tenantId,
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          }
        )

        if (!response.ok) {
          logger.error(
            { status: response.status, tenantId },
            'Failed to search proposals via internal API'
          )
          return {
            proposals: [],
            total: 0,
            error: `API responded with status ${String(response.status)}`,
          }
        }

        const json: unknown = await response.json()

        if (typeof json === 'object' && json !== null && 'data' in json) {
          return (json as { data: unknown }).data
        }

        return { proposals: [], total: 0, error: 'Unexpected response format' }
      } catch (err: unknown) {
        logger.error(
          { err, tenantId },
          'Error calling internal API for proposal search'
        )
        return { proposals: [], total: 0, error: 'Failed to search proposals' }
      }
    },
  })
}
