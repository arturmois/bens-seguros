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

const logger = pino({ name: 'trial-expiry-processor' })
const QUEUE_NAME = 'erp-trial-expiry'
const BATCH_LIMIT = 100

type TrialRow = {
  id: string
  organizationId: string
  trialEndsAt: Date | null
}

export type TrialExpiryLogger = {
  info: (msg: object | string, ...args: unknown[]) => void
  warn: (msg: object | string, ...args: unknown[]) => void
  error: (msg: object | string, ...args: unknown[]) => void
}

export type TrialExpiryDeps = {
  findExpiredTrials: (now: Date) => Promise<TrialRow[]>
  expireTrial: (row: TrialRow, endedAt: Date) => Promise<void>
  invalidateCache: (organizationId: string) => Promise<void>
  now: () => Date
  logger: TrialExpiryLogger
}

export type TrialExpiryBatchResult = {
  expiredCount: number
  failureCount: number
}

export async function runTrialExpiryBatch(
  deps: TrialExpiryDeps
): Promise<TrialExpiryBatchResult> {
  const now = deps.now()
  const rows = await deps.findExpiredTrials(now)
  let expiredCount = 0
  let failureCount = 0

  for (const row of rows) {
    try {
      await deps.expireTrial(row, now)
      await deps.invalidateCache(row.organizationId)
      deps.logger.info(
        {
          subscriptionId: row.id,
          organizationId: row.organizationId,
          trialEndsAt: row.trialEndsAt,
        },
        'Trial expired'
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
        'Trial expiry failed for subscription'
      )
      failureCount += 1
    }
  }

  if (rows.length > 0) {
    deps.logger.info(
      { total: rows.length, expiredCount, failureCount },
      'Trial expiry batch complete'
    )
  }
  return { expiredCount, failureCount }
}

function makeTrialExpiryDeps(redis: IORedis): TrialExpiryDeps {
  return {
    now: () => new Date(),
    findExpiredTrials: async (now) =>
      prismaAdmin.subscription.findMany({
        where: {
          status: 'TRIALING',
          trialEndsAt: { lt: now },
        },
        select: {
          id: true,
          organizationId: true,
          trialEndsAt: true,
        },
        orderBy: { trialEndsAt: 'asc' },
        take: BATCH_LIMIT,
      }),
    expireTrial: async (row, endedAt) => {
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

export function setupTrialExpiryProcessor(connection: ConnectionOptions) {
  const queue = new Queue(QUEUE_NAME, { connection })
  void queue.upsertJobScheduler(
    'trial-expiry-hourly',
    { pattern: '0 * * * *' },
    { name: 'expire-trials' }
  )
  const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const deps = makeTrialExpiryDeps(redis)
      const result = await runTrialExpiryBatch(deps)
      logger.info(result, 'Trial expiry job completed')
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
    logger.error({ jobId: job?.id, err }, 'Trial expiry job failed')
  })
  return { worker, queue, redis }
}
