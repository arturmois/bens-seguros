import { tool } from 'ai'
import { z } from 'zod'
import { Conversation, Message } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type { PubsubClient } from '../types/pubsub-client.js'

export function createEscalateToHumanTool(
  conversationId: string,
  tenantId: string,
  pubsubClient: PubsubClient
) {
  return tool({
    description:
      'Transfere o atendimento para um atendente humano. Use quando: cliente pede explicitamente, assunto exige decisão humana, você não consegue resolver, ou tema é sensível (sinistro, reclamação).',
    parameters: z.object({
      reason: z.string().describe('Motivo da transferencia para registro'),
    }),
    execute: async ({ reason }) => {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        tenantId,
      })
        .lean()
        .exec()
      if (!conversation || conversation.status !== 'BOT_ACTIVE') {
        return {
          transferred: false,
          reason,
          detail: 'Conversa não está em atendimento por IA',
        }
      }

      await Conversation.updateOne(
        { _id: conversationId, tenantId, status: 'BOT_ACTIVE' },
        { $set: { status: 'WAITING_HUMAN' } }
      ).exec()

      await Message.create({
        conversationId,
        tenantId,
        senderType: 'SYSTEM',
        text: `Transferido para um atendente. Motivo: ${reason}`,
        type: 'TEXT',
        status: 'DELIVERED',
      })

      await pubsubClient.publish(
        CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
        JSON.stringify({ tenantId, conversationId, status: 'WAITING_HUMAN' })
      )

      return { transferred: true, reason }
    },
  })
}
