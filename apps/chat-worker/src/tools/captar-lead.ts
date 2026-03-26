import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'

const logger = pino({ name: 'captar-lead-tool' })

const FETCH_TIMEOUT_MS = 10_000

export function createCaptarLeadTool(tenantId: string, contactPhone: string) {
  return tool({
    description:
      'Registra interesse do cliente em um seguro e cria uma proposta no sistema. Use quando o cliente demonstrar interesse em cotar ou contratar um seguro.',
    parameters: z.object({
      nomeCliente: z.string().describe('Nome completo do cliente'),
      tipoSeguro: z
        .enum(['AUTO', 'VIDA', 'RESIDENCIAL', 'EMPRESARIAL', 'VIAGEM', 'OUTRO'])
        .describe('Tipo de seguro desejado'),
      detalhes: z
        .string()
        .optional()
        .describe('Detalhes adicionais como modelo do carro, endereco, etc'),
    }),
    execute: async ({ nomeCliente, tipoSeguro, detalhes }) => {
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
          clientName: nomeCliente,
          clientPhone: contactPhone,
          insuranceType: tipoSeguro,
          notes: detalhes ?? '',
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

        const data: unknown = await response.json()
        return {
          success: true,
          message: `Proposta registrada com sucesso para ${nomeCliente} - ${tipoSeguro}`,
          data,
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
