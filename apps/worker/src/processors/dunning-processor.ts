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

const logger = pino({ name: 'dunning-processor' })
const QUEUE_NAME = 'erp-dunning'
const BATCH_LIMIT = 100
const PAST_DUE_GRACE_DAYS = 8
const MS_PER_DAY = 24 * 60 * 60 * 1000

type PastDueRow = {
  id: string
  organizationId: string
  oldestOverdueDueDate: Date
}

export type DunningLogger = {
  info: (msg: object | string, ...args: unknown[]) => void
  warn: (msg: object | string, ...args: unknown[]) => void
  error: (msg: object | string, ...args: unknown[]) => void
}

export type DunningDeps = {
  findPastDueForExpiry: (now: Date) => Promise<PastDueRow[]>
  expirePastDue: (row: PastDueRow, endedAt: Date) => Promise<void>
  invalidateCache: (organizationId: string) => Promise<void>
  now: () => Date
  logger: DunningLogger
}

export type DunningBatchResult = {
  expiredCount: number
  failureCount: number
}

export async function runDunningBatch(
  deps: DunningDeps
): Promise<DunningBatchResult> {
  const now = deps.now()
  const rows = await deps.findPastDueForExpiry(now)
  let expiredCount = 0
  let failureCount = 0

  for (const row of rows) {
    try {
      await deps.expirePastDue(row, now)
      await deps.invalidateCache(row.organizationId)
      deps.logger.info(
        {
          subscriptionId: row.id,
          organizationId: row.organizationId,
          oldestOverdueDueDate: row.oldestOverdueDueDate,
        },
        'Past-due subscription expired (dunning cutoff reached)'
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
        'Dunning expiry failed for subscription'
      )
      failureCount += 1
    }
  }

  if (rows.length > 0) {
    deps.logger.info(
      { total: rows.length, expiredCount, failureCount },
      'Dunning batch complete'
    )
  }
  return { expiredCount, failureCount }
}

function makeDunningDeps(redis: IORedis): DunningDeps {
  return {
    now: () => new Date(),
    findPastDueForExpiry: async (now) => {
      const cutoff = new Date(now.getTime() - PAST_DUE_GRACE_DAYS * MS_PER_DAY)
      const subscriptions = await prismaAdmin.subscription.findMany({
        where: {
          status: 'PAST_DUE',
          invoices: {
            some: {
              status: 'OVERDUE',
              dueDate: { lt: cutoff },
            },
          },
        },
        select: {
          id: true,
          organizationId: true,
          invoices: {
            where: { status: 'OVERDUE', dueDate: { lt: cutoff } },
            select: { dueDate: true },
            orderBy: { dueDate: 'asc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'asc' },
        take: BATCH_LIMIT,
      })
      return subscriptions.flatMap((s) => {
        const oldest = s.invoices[0]
        if (!oldest) return []
        return [
          {
            id: s.id,
            organizationId: s.organizationId,
            oldestOverdueDueDate: oldest.dueDate,
          },
        ]
      })
    },
    expirePastDue: async (row, endedAt) => {
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

export function setupDunningProcessor(connection: ConnectionOptions) {
  const queue = new Queue(QUEUE_NAME, { connection })
  void queue.upsertJobScheduler(
    'dunning-hourly',
    { pattern: '0 * * * *' },
    { name: 'expire-past-due-subscriptions' }
  )
  const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const deps = makeDunningDeps(redis)
      const result = await runDunningBatch(deps)
      logger.info(result, 'Dunning job completed')
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
    logger.error({ jobId: job?.id, err }, 'Dunning job failed')
  })
  return { worker, queue }
}
