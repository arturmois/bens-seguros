import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'

const logger = pino({ name: 'search-policy-tool' })

const FETCH_TIMEOUT_MS = 10_000

export function createSearchPolicyTool(tenantId: string) {
  return tool({
    description:
      'Consulta apólices de seguro ativas de um cliente. Use para verificar se o cliente já possui seguro vigente, especialmente antes de registrar sinistro ou oferecer renovação.',
    parameters: z.object({
      clientId: z.string().optional().describe('ID do cliente'),
      phone: z.string().optional().describe('Telefone do cliente para busca'),
      branch: z
        .enum([
          'AUTO',
          'RESIDENTIAL',
          'LIFE',
          'BUSINESS',
          'TRAVEL',
          'CONDOMINIUM',
          'OTHER',
        ])
        .optional()
        .describe('Ramo do seguro para filtrar'),
    }),
    execute: async ({ clientId, phone, branch }) => {
      if (!clientId && !phone) {
        return {
          policies: [],
          total: 0,
          error: 'clientId or phone is required',
        }
      }

      if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) {
        logger.warn(
          { tenantId },
          'Internal API not configured, skipping policy search'
        )
        return { policies: [], total: 0, error: 'Internal API not configured' }
      }

      try {
        const params = new URLSearchParams()
        if (clientId) params.set('clientId', clientId)
        if (phone) params.set('phone', phone)
        if (branch) params.set('branch', branch)

        const path = '/api/internal/policies'
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
            'Failed to search policies via internal API'
          )
          return {
            policies: [],
            total: 0,
            error: `API responded with status ${String(response.status)}`,
          }
        }

        const json: unknown = await response.json()

        if (typeof json === 'object' && json !== null && 'data' in json) {
          return (json as { data: unknown }).data
        }

        return { policies: [], total: 0, error: 'Unexpected response format' }
      } catch (err: unknown) {
        logger.error(
          { err, tenantId },
          'Error calling internal API for policy search'
        )
        return { policies: [], total: 0, error: 'Failed to search policies' }
      }
    },
  })
}
