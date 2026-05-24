import { Conversation } from '@repo/db-chat'
import { tool } from 'ai'
import { z } from 'zod'

import { transferConversationToHuman } from '../processors/transfer-to-human-helper.js'
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
      reason: z.string().describe('Motivo da transferência para registro'),
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
      const result = await transferConversationToHuman(
        conversationId,
        tenantId,
        pubsubClient,
        {
          reason,
          systemMessage: `Transferido para um atendente. Motivo: ${reason}`,
        }
      )
      return { transferred: result.transferred, reason }
    },
  })
}
