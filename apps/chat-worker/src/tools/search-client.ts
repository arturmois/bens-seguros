import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'

const logger = pino({ name: 'search-client-tool' })

const FETCH_TIMEOUT_MS = 10_000

export function createSearchClientTool(tenantId: string) {
  return tool({
    description:
      'Busca cliente cadastrado por telefone ou CPF/CNPJ. Use para verificar se o cliente ja possui cadastro, apolices ou propostas antes de coletar dados.',
    parameters: z.object({
      phone: z.string().optional().describe('Telefone do cliente para busca'),
      document: z
        .string()
        .optional()
        .describe('CPF ou CNPJ do cliente para busca'),
    }),
    execute: async ({ phone, document }) => {
      if (!phone && !document) {
        return {
          found: false,
          error: 'At least one of phone or document is required',
        }
      }

      if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) {
        logger.warn(
          { tenantId },
          'Internal API not configured, skipping client search'
        )
        return { found: false, error: 'Internal API not configured' }
      }

      try {
        const params = new URLSearchParams()
        if (phone) params.set('phone', phone)
        if (document) params.set('document', document)

        const path = '/api/internal/clients/search'
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
            'Failed to search client via internal API'
          )
          return {
            found: false,
            error: `API responded with status ${String(response.status)}`,
          }
        }

        const json: unknown = await response.json()

        if (typeof json === 'object' && json !== null && 'data' in json) {
          return (json as { data: unknown }).data
        }

        return { found: false, error: 'Unexpected response format' }
      } catch (err: unknown) {
        logger.error(
          { err, tenantId },
          'Error calling internal API for client search'
        )
        return { found: false, error: 'Failed to search client' }
      }
    },
  })
}
