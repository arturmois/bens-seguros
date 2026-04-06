import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'

const logger = pino({ name: 'update-client-data-tool' })

const FETCH_TIMEOUT_MS = 10_000

export function createUpdateClientDataTool(tenantId: string) {
  return tool({
    description:
      'Atualiza dados cadastrais do cliente (CPF, email, endereço, nascimento). Use após identificar o cliente para completar ou corrigir informações.',
    parameters: z.object({
      clientId: z.string().describe('ID do cliente a ser atualizado'),
      document: z.string().optional().describe('CPF ou CNPJ do cliente'),
      email: z.string().email().optional().describe('Email do cliente'),
      address: z
        .object({
          zipCode: z.string().optional(),
          street: z.string().optional(),
          number: z.string().optional(),
          complement: z.string().optional(),
          neighborhood: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
        })
        .optional()
        .describe('Endereço do cliente'),
      birthDate: z
        .string()
        .optional()
        .describe('Data de nascimento no formato ISO 8601 (YYYY-MM-DD)'),
      profession: z.string().optional().describe('Profissão do cliente'),
      maritalStatus: z
        .enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'])
        .optional()
        .describe('Estado civil do cliente'),
    }),
    execute: async ({ clientId, ...fields }) => {
      if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) {
        logger.warn(
          { tenantId },
          'Internal API not configured, skipping client update'
        )
        return { success: false, message: 'Internal API not configured' }
      }

      try {
        const path = `/api/internal/clients/${clientId}`
        const body = JSON.stringify(fields)
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
            { status: response.status, tenantId, clientId },
            'Failed to update client via internal API'
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
          const data = (json as { data: { success: boolean; message: string } })
            .data
          return { success: data.success, message: data.message }
        }

        return { success: true, message: 'Dados do cliente atualizados' }
      } catch (err: unknown) {
        logger.error(
          { err, tenantId, clientId },
          'Error calling internal API for client update'
        )
        return { success: false, message: 'Failed to update client data' }
      }
    },
  })
}
