import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'

const logger = pino({ name: 'captar-lead-tool' })

const INTERNAL_API_URL = process.env['INTERNAL_API_URL'] ?? ''
const INTERNAL_API_TOKEN = process.env['INTERNAL_API_TOKEN'] ?? ''

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
      if (!INTERNAL_API_URL || !INTERNAL_API_TOKEN) {
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
        const response = await fetch(`${INTERNAL_API_URL}/api/proposals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': INTERNAL_API_TOKEN,
            'X-Tenant-Id': tenantId,
          },
          body: JSON.stringify({
            clientName: nomeCliente,
            clientPhone: contactPhone,
            insuranceType: tipoSeguro,
            notes: detalhes ?? '',
            source: 'WHATSAPP_BOT',
          }),
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
