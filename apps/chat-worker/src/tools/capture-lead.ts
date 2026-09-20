import type { ContactSource } from '@repo/shared'
import { Contact } from '@repo/db-chat'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'
import { tool } from 'ai'
import pino from 'pino'
import { z } from 'zod'

import { transferConversationToHuman } from '../processors/transfer-to-human-helper.js'
import type { PubsubClient } from '../types/pubsub-client.js'

const logger = pino({ name: 'capture-lead-tool' })

const FETCH_TIMEOUT_MS = 10_000

export function createCaptureLeadTool(
  tenantId: string,
  contactPhone: string,
  source: ContactSource,
  conversationId: string,
  pubsubClient: PubsubClient
) {
  return tool({
    description:
      'Registra interesse do cliente em um seguro e cria uma proposta no sistema. Use quando o cliente demonstrar interesse em cotar ou contratar um seguro.',
    parameters: z.object({
      clientName: z.string().describe('Nome completo do cliente'),
      insuranceType: z
        .enum([
          'AUTO',
          'LIFE',
          'RESIDENTIAL',
          'CONDOMINIUM',
          'BUSINESS',
          'OTHER',
        ])
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
            'Captação de lead indisponível no momento. Um atendente vai ajudá-lo em breve.',
        }
      }
      const storedContact = await Contact.findOne({
        tenantId,
        whatsappPhone: contactPhone,
      }).lean()
      const authoritativeName =
        typeof storedContact?.name === 'string' && storedContact.name.length > 0
          ? storedContact.name
          : clientName
      try {
        const body = JSON.stringify({
          clientName: authoritativeName,
          clientPhone: contactPhone,
          insuranceType,
          notes: details ?? '',
          source,
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
        let contactId: string | null = null
        if (
          typeof json === 'object' &&
          json !== null &&
          'data' in json &&
          typeof json.data === 'object' &&
          json.data !== null
        ) {
          const data = json.data
          if ('proposalId' in data && typeof data.proposalId === 'string') {
            proposalId = data.proposalId
          }
          if ('contactId' in data && typeof data.contactId === 'string') {
            contactId = data.contactId
          }
        }
        if (contactId) {
          try {
            await Contact.updateOne(
              { tenantId, whatsappPhone: contactPhone },
              { $set: { pgContactId: contactId } }
            )
          } catch (mongoErr: unknown) {
            logger.warn(
              { err: mongoErr, tenantId, contactId },
              'Failed to persist pgContactId on MongoDB Contact'
            )
          }
        }
        const transferResult = await transferConversationToHuman(
          conversationId,
          tenantId,
          pubsubClient,
          {
            reason: 'lead_captured',
            systemMessage:
              'Cotação registrada. Um atendente vai dar continuidade em breve.',
          }
        )
        return {
          success: true,
          proposalId,
          transferred: transferResult.transferred,
          message: proposalId
            ? `Proposta ${proposalId} registrada com sucesso para ${clientName} - ${insuranceType}. Atendimento transferido para humano.`
            : `Proposta registrada com sucesso para ${clientName} - ${insuranceType}. Atendimento transferido para humano.`,
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
