import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'

const logger = pino({ name: 'capture-lead-tool' })

const FETCH_TIMEOUT_MS = 10_000

export function createCaptureLeadTool(tenantId: string, contactPhone: string) {
  return tool({
    description:
      'Registra interesse do cliente em um seguro e cria uma proposta no sistema. Use quando o cliente demonstrar interesse em cotar ou contratar um seguro.',
    parameters: z.object({
      clientName: z.string().describe('Nome completo do cliente'),
      insuranceType: z
        .enum(['AUTO', 'LIFE', 'RESIDENTIAL', 'BUSINESS', 'TRAVEL', 'OTHER'])
        .describe('Tipo de seguro desejado'),
      details: z
        .string()
        .optional()
        .describe('Detalhes adicionais como modelo do carro, endereco, etc'),
    }),
    execute: async ({ clientName, insuranceType, details }) => {
      if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) {
        logger.warn(
          { tenantId },
          'Internal API not configured, skipping lead capture'
        )
        return {
          success: false,
          message:
            'Captacao de lead indisponivel no momento. Um atendente vai ajudar.',
        }
      }

      try {
        const body = JSON.stringify({
          clientName,
          clientPhone: contactPhone,
          insuranceType,
          notes: details ?? '',
          source: 'WHATSAPP_BOT',
        })

        const path = '/api/internal/leads'
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = signRequest({
          secret: env.INTERNAL_API_SECRET,
          method: 'POST',
          path,
          tenantId,
          body,
          timestamp,
        })

        const response = await fetch(`${env.INTERNAL_API_URL}${path}`, {
          method: 'POST',
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
            { status: response.status, tenantId },
            'Failed to create proposal via internal API'
          )
          return {
            success: false,
            message:
              'Tive um problema ao registrar, mas anotei seus dados. Um atendente vai entrar em contato.',
          }
        }

        const json: unknown = await response.json()

        let proposalId: string | null = null
        if (
          typeof json === 'object' &&
          json !== null &&
          'data' in json &&
          typeof json.data === 'object' &&
          json.data !== null &&
          'proposalId' in json.data &&
          typeof json.data.proposalId === 'string'
        ) {
          proposalId = json.data.proposalId
        }

        return {
          success: true,
          proposalId,
          message: proposalId
            ? `Proposta ${proposalId} registrada com sucesso para ${clientName} - ${insuranceType}`
            : `Proposta registrada com sucesso para ${clientName} - ${insuranceType}`,
        }
      } catch (err: unknown) {
        logger.error(
          { err, tenantId },
          'Error calling internal API for lead capture'
        )
        return {
          success: false,
          message:
            'Tive um problema ao registrar, mas anotei seus dados. Um atendente vai entrar em contato.',
        }
      }
    },
  })
}
