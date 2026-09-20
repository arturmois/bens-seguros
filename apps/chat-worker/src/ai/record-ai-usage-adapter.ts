import {
  type AiUsageCallback,
  calculateCostMicrocents,
  hashIdShort,
} from '@repo/ai'
import { env } from '@repo/env'
import { Queue } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'record-ai-usage-adapter' })
const QUEUE_NAME = 'erp-record-ai-usage'

export interface RecordAiUsageJobData {
  readonly organizationId: string
  readonly provider: string
  readonly model: string
  readonly inputQuantity: number
  readonly outputQuantity: number
  readonly unitType: 'TOKEN' | 'CHARACTER' | 'IMAGE'
  readonly inputCostMicrocents: number
  readonly outputCostMicrocents: number
  readonly channelIdHash?: string
  readonly conversationIdHash?: string
  readonly messageIdHash?: string
  readonly agentIdHash?: string
}

function parseRedisUrl(url: string): {
  host: string
  port: number
  password?: string
} {
  const parsed = new URL(url)
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port) || 6379,
    ...(parsed.password
      ? { password: decodeURIComponent(parsed.password) }
      : {}),
  }
}

let usageQueue: Queue<RecordAiUsageJobData> | null = null

function getQueue(): Queue<RecordAiUsageJobData> {
  if (!usageQueue) {
    const redisInfo = parseRedisUrl(env.REDIS_URL)
    usageQueue = new Queue<RecordAiUsageJobData>(QUEUE_NAME, {
      connection: {
        host: redisInfo.host,
        port: redisInfo.port,
        ...(redisInfo.password ? { password: redisInfo.password } : {}),
      },
    })
  }
  return usageQueue
}

export function createRecordAiUsageAdapter(
  enqueue: (data: RecordAiUsageJobData) => Promise<unknown>
): AiUsageCallback {
  return async (event) => {
    try {
      const cost = calculateCostMicrocents({
        provider: event.provider,
        model: event.model,
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
      })
      await enqueue({
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
      logger.info(
        {
          organizationId: event.metadata.organizationId,
          inputTokens: event.inputTokens,
          outputTokens: event.outputTokens,
        },
        'AI usage enqueued'
      )
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to record AI usage — swallowed')
    }
  }
}

export const recordAiUsage: AiUsageCallback = createRecordAiUsageAdapter(
  (data) => getQueue().add('record-ai-usage', data)
)
