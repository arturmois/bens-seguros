import { env } from '@repo/env'
import type { BulkJobOptions } from 'bullmq'
import { Queue } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'send-quote-enqueuer' })

export interface SendQuoteEmailJobData {
  proposalId: string
  organizationId: string
  storageKey: string
  recipientEmail: string
  recipientName: string
  salespersonName: string
  salespersonEmail: string | null
  organizationName: string
  branch: string
  premiumFormatted: string
}

const DEFAULT_JOB_OPTIONS: BulkJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

let sendQuoteQueue: Queue<SendQuoteEmailJobData> | null = null

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

function getQueue(): Queue<SendQuoteEmailJobData> {
  if (!sendQuoteQueue) {
    const redisInfo = parseRedisUrl(env.REDIS_URL)
    sendQuoteQueue = new Queue<SendQuoteEmailJobData>('erp-send-quote', {
      connection: {
        host: redisInfo.host,
        port: redisInfo.port,
        ...(redisInfo.password ? { password: redisInfo.password } : {}),
      },
    })
  }
  return sendQuoteQueue
}

export async function enqueueSendQuoteEmail(
  data: SendQuoteEmailJobData
): Promise<void> {
  try {
    await getQueue().add('send-quote-email', data, DEFAULT_JOB_OPTIONS)
  } catch (err: unknown) {
    logger.error(
      { err, proposalId: data.proposalId },
      'Failed to enqueue send-quote-email'
    )
    throw err
  }
}
