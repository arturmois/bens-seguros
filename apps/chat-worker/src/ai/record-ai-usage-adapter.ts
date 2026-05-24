import {
  type AiUsageCallback,
  calculateCostMicrocents,
  hashIdShort,
} from '@repo/ai'
import { createAiUsageRecord, PrismaAiUsageRepository } from '@repo/core'
import { prismaAdmin } from '@repo/db'
import pino from 'pino'

const logger = pino({ name: 'record-ai-usage-adapter' })
const repository = new PrismaAiUsageRepository(prismaAdmin)

export const recordAiUsage: AiUsageCallback = async (event) => {
  try {
    const cost = calculateCostMicrocents({
      provider: event.provider,
      model: event.model,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
    })

    const record = createAiUsageRecord({
      organizationId: event.metadata.organizationId,
      provider: event.provider,
      model: event.model,
      inputQuantity: event.inputTokens,
      outputQuantity: event.outputTokens,
      unitType: cost.unitType,
      inputCostMicrocents: cost.inputCostMicrocents,
      outputCostMicrocents: cost.outputCostMicrocents,
      ...(event.metadata.channelId !== undefined && {
        channelIdHash: hashIdShort(event.metadata.channelId),
      }),
      ...(event.metadata.conversationId !== undefined && {
        conversationIdHash: hashIdShort(event.metadata.conversationId),
      }),
      ...(event.metadata.messageId !== undefined && {
        messageIdHash: hashIdShort(event.metadata.messageId),
      }),
      ...(event.metadata.agentId !== undefined && {
        agentIdHash: hashIdShort(event.metadata.agentId),
      }),
    })

    await repository.create(record)

    logger.info(
      {
        organizationId: record.organizationId,
        periodKey: record.periodKey,
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
      },
      'AI usage recorded'
    )
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to record AI usage — swallowed')
  }
}
