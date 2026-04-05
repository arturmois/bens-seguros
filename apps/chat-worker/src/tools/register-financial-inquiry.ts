import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { Conversation } from '@repo/db-chat'
import type { PubsubClient } from '../types/pubsub-client.js'
import { escalateToHuman } from '../processors/ai-bot-helpers.js'

const logger = pino({ name: 'register-financial-inquiry-tool' })

export function createRegisterFinancialInquiryTool(
  conversationId: string,
  tenantId: string,
  pubsubClient: PubsubClient
) {
  return tool({
    description:
      'Registra dúvida financeira do cliente (pagamento, boleto, etc.) com dados de contexto e transfere para atendente especializado. Use quando o motivo do contato é financeiro.',
    parameters: z.object({
      document: z
        .string()
        .describe('CPF ou CNPJ do cliente para identificação'),
      vehiclePlate: z
        .string()
        .optional()
        .describe('Placa do veículo, se aplicável'),
      vehicleModel: z
        .string()
        .optional()
        .describe('Modelo do veículo, se aplicável'),
      inquiryDescription: z
        .string()
        .describe('Descrição da dúvida financeira (pagamento, boleto, etc.)'),
    }),
    execute: async ({
      document,
      vehiclePlate,
      vehicleModel,
      inquiryDescription,
    }) => {
      try {
        const financialInquiry = {
          type: 'FINANCIAL_INQUIRY',
          document,
          vehiclePlate: vehiclePlate ?? null,
          vehicleModel: vehicleModel ?? null,
          inquiryDescription,
          collectedAt: new Date().toISOString(),
        }

        await Conversation.updateOne(
          { _id: conversationId, tenantId },
          { $set: { 'metadata.financialInquiry': financialInquiry } }
        ).exec()

        await escalateToHuman(conversationId, tenantId, pubsubClient)

        return {
          success: true,
          message:
            'Dados registrados. Um atendente especializado entrará em contato.',
        }
      } catch (err: unknown) {
        logger.error({ err, tenantId }, 'Error registering financial inquiry')
        return {
          success: false,
          message: 'Erro ao registrar. Transferindo para atendente.',
        }
      }
    },
  })
}
