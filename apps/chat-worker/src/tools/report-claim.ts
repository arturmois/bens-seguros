import { tool } from 'ai'
import { z } from 'zod'
import pino from 'pino'
import { env } from '@repo/env'
import { signRequest, CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import { Conversation, Message } from '@repo/db-chat'
import type { PubsubClient } from '../types/pubsub-client.js'
import { escalateToHuman } from '../processors/ai-bot-helpers.js'

const logger = pino({ name: 'report-claim-tool' })

const FETCH_TIMEOUT_MS = 10_000

interface ClaimResponseData {
  claimCreated: boolean
  claimNumber: string | null
  dataSaved: boolean
  claimData: Record<string, unknown> | null
  message: string
}

interface InternalApiResponse {
  success: boolean
  data: ClaimResponseData
}

export function createReportClaimTool(
  conversationId: string,
  tenantId: string,
  pubsubClient: PubsubClient
) {
  return tool({
    description:
      'Registra um sinistro. Se encontrar apólice ativa do cliente, cria o sinistro no sistema. Se não encontrar, salva os dados e transfere para um corretor. Use no fluxo de urgência/emergência.',
    parameters: z.object({
      phoneOrDocument: z
        .string()
        .describe('Telefone ou CPF/CNPJ do cliente para busca'),
      description: z.string().describe('Descrição do sinistro ou ocorrência'),
      incidentDate: z
        .string()
        .optional()
        .describe('Data do incidente no formato ISO (YYYY-MM-DD)'),
      incidentLocation: z
        .string()
        .optional()
        .describe('Local onde ocorreu o incidente'),
      insuranceType: z
        .enum([
          'AUTO',
          'RESIDENTIAL',
          'LIFE',
          'BUSINESS',
          'CONDOMINIUM',
          'TRAVEL',
          'OTHER',
        ])
        .optional()
        .describe('Tipo de seguro relacionado ao sinistro'),
    }),
    execute: async ({
      phoneOrDocument,
      description,
      incidentDate,
      incidentLocation,
      insuranceType,
    }) => {
      if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) {
        logger.warn(
          { tenantId },
          'Internal API not configured, skipping claim report'
        )
        return {
          claimCreated: false,
          dataSaved: false,
          message:
            'Registro de sinistro indisponível no momento. Um atendente vai ajudar.',
        }
      }
      try {
        const body = JSON.stringify({
          phoneOrDocument,
          description,
          ...(incidentDate ? { incidentDate } : {}),
          ...(incidentLocation ? { incidentLocation } : {}),
          ...(insuranceType ? { insuranceType } : {}),
        })
        const path = '/api/internal/claims'
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
            'Failed to register claim via internal API'
          )
          return {
            claimCreated: false,
            dataSaved: false,
            message:
              'Tive um problema ao registrar o sinistro. Um atendente vai ajudar.',
          }
        }
        const json = (await response.json()) as InternalApiResponse
        if (!json.data.claimCreated && json.data.claimData) {
          await Conversation.updateOne(
            { _id: conversationId, tenantId },
            { $set: { 'metadata.claimData': json.data.claimData } }
          ).exec()
          const explanationText =
            'Não encontrei uma apólice ativa vinculada ao seu cadastro. ' +
            'Seus dados do sinistro foram salvos e vou transferir você para ' +
            'um corretor que poderá dar continuidade ao atendimento.'
          const botMessage = await Message.create({
            conversationId,
            tenantId,
            senderType: 'BOT',
            senderName: 'Assistente Virtual',
            text: explanationText,
            type: 'TEXT',
            status: 'DELIVERED',
          })
          await pubsubClient.publish(
            CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
            JSON.stringify({
              id: String(botMessage._id),
              conversationId,
              tenantId,
              senderType: 'BOT',
              senderName: 'Assistente Virtual',
              senderId: null,
              text: explanationText,
              type: 'TEXT',
              status: 'DELIVERED',
              externalId: null,
              createdAt:
                botMessage.createdAt?.toISOString() ?? new Date().toISOString(),
            })
          )
          await escalateToHuman(conversationId, tenantId, pubsubClient)
          return {
            claimCreated: false,
            dataSaved: true,
            message: json.data.message,
          }
        }
        return {
          claimCreated: json.data.claimCreated,
          claimNumber: json.data.claimNumber,
          dataSaved: json.data.dataSaved,
          message: json.data.message,
        }
      } catch (err: unknown) {
        logger.error(
          { err, tenantId },
          'Error calling internal API for claim report'
        )
        return {
          claimCreated: false,
          dataSaved: false,
          message:
            'Tive um problema ao registrar o sinistro. Um atendente vai ajudar.',
        }
      }
    },
  })
}
