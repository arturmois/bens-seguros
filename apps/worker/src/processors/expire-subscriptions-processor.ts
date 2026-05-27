import { prismaAdmin } from '@repo/db'
import { env } from '@repo/env'
import {
  SUBSCRIPTION_INVALIDATION_CHANNEL,
  subscriptionCacheKey,
} from '@repo/shared'
import type { ConnectionOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'

const logger = pino({ name: 'expire-subscriptions-processor' })
const QUEUE_NAME = 'erp-expire-subscriptions'
const BATCH_LIMIT = 100

type SubscriptionRow = {
  id: string
  organizationId: string
  currentPeriodEnd: Date
}

export type ExpireSubscriptionsLogger = {
  info: (msg: object | string, ...args: unknown[]) => void
  warn: (msg: object | string, ...args: unknown[]) => void
  error: (msg: object | string, ...args: unknown[]) => void
}

export type ExpireSubscriptionsDeps = {
  findCanceledExpired: (now: Date) => Promise<SubscriptionRow[]>
  expireSubscription: (row: SubscriptionRow, endedAt: Date) => Promise<void>
  invalidateCache: (organizationId: string) => Promise<void>
  now: () => Date
  logger: ExpireSubscriptionsLogger
}

export type ExpireSubscriptionsBatchResult = {
  expiredCount: number
  failureCount: number
}

export async function runExpireSubscriptionsBatch(
  deps: ExpireSubscriptionsDeps
): Promise<ExpireSubscriptionsBatchResult> {
  const now = deps.now()
  const rows = await deps.findCanceledExpired(now)
  let expiredCount = 0
  let failureCount = 0

  for (const row of rows) {
    try {
      await deps.expireSubscription(row, now)
      await deps.invalidateCache(row.organizationId)
      deps.logger.info(
        {
          subscriptionId: row.id,
          organizationId: row.organizationId,
          currentPeriodEnd: row.currentPeriodEnd,
        },
        'Subscription expired (canceled → expired)'
      )
      expiredCount += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      deps.logger.error(
        {
          subscriptionId: row.id,
          organizationId: row.organizationId,
          err: msg,
        },
        'Subscription expiry failed'
      )
      failureCount += 1
    }
  }

  if (rows.length > 0) {
    deps.logger.info(
      { total: rows.length, expiredCount, failureCount },
      'Expire-subscriptions batch complete'
    )
  }
  return { expiredCount, failureCount }
}

function makeExpireSubscriptionsDeps(redis: IORedis): ExpireSubscriptionsDeps {
  return {
    now: () => new Date(),
    findCanceledExpired: async (now) =>
      prismaAdmin.subscription.findMany({
        where: {
          status: 'CANCELED',
          currentPeriodEnd: { lt: now },
        },
        select: {
          id: true,
          organizationId: true,
          currentPeriodEnd: true,
        },
        orderBy: { currentPeriodEnd: 'asc' },
        take: BATCH_LIMIT,
      }),
    expireSubscription: async (row, endedAt) => {
      await prismaAdmin.subscription.update({
        where: { id: row.id },
        data: { status: 'EXPIRED', endedAt },
      })
    },
    invalidateCache: async (organizationId) => {
      await redis.del(subscriptionCacheKey(organizationId))
      await redis.publish(SUBSCRIPTION_INVALIDATION_CHANNEL, organizationId)
    },
    logger,
  }
}

export function setupExpireSubscriptionsProcessor(
  connection: ConnectionOptions
) {
  const queue = new Queue(QUEUE_NAME, { connection })
  void queue.upsertJobScheduler(
    'expire-subscriptions-hourly',
    { pattern: '0 * * * *' },
    { name: 'expire-canceled-subscriptions' }
  )
  const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const deps = makeExpireSubscriptionsDeps(redis)
      const result = await runExpireSubscriptionsBatch(deps)
      logger.info(result, 'Expire-subscriptions job completed')
    },
    {
      connection,
      concurrency: 1,
      maxStalledCount: 2,
      stalledInterval: 5_000,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86_400 },
    }
  )
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Expire-subscriptions job failed')
  })
  return { worker, queue }
}
