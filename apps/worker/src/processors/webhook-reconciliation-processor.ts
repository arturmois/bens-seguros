import { CanonicalEventSchema, type CanonicalEvent } from '@repo/billing-port'
import {
  ProcessBillingWebhookEvent,
  PrismaSubscriptionRepository,
} from '@repo/core'
import { type Prisma, prismaAdmin } from '@repo/db'
import { env } from '@repo/env'
import {
  SUBSCRIPTION_INVALIDATION_CHANNEL,
  subscriptionCacheKey,
} from '@repo/shared'
import type { ConnectionOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'

const logger = pino({ name: 'webhook-reconciliation-processor' })
const QUEUE_NAME = 'erp-webhook-reconciliation'
const MAX_AGE_DAYS = 7
const BATCH_LIMIT = 100

type FailedRow = {
  id: string
  source: string
  externalId: string
  eventType: string
  payload: Prisma.JsonValue
  processingError: string | null
  processedAt: Date | null
  receivedAt: Date
}

export type ReconciliationLogger = {
  info: (msg: object | string, ...args: unknown[]) => void
  warn: (msg: object | string, ...args: unknown[]) => void
  error: (msg: object | string, ...args: unknown[]) => void
}

export type ReconciliationDeps = {
  findFailedWebhookEvents: () => Promise<FailedRow[]>
  updateWebhookEvent: (
    id: string,
    data: { processedAt?: Date; processingError?: string | null }
  ) => Promise<void>
  processEvent: (canonical: CanonicalEvent) => Promise<{ processed: boolean }>
  logger: ReconciliationLogger
}

export type BatchResult = {
  successCount: number
  failureCount: number
  skippedCount: number
}

export async function runReconciliationBatch(
  deps: ReconciliationDeps
): Promise<BatchResult> {
  const rows = await deps.findFailedWebhookEvents()
  let successCount = 0
  let failureCount = 0
  let skippedCount = 0

  for (const row of rows) {
    const parsed = CanonicalEventSchema.safeParse(row.payload)
    if (!parsed.success) {
      deps.logger.warn(
        { id: row.id, externalId: row.externalId, err: parsed.error.message },
        'Webhook reconciliation: payload invalid (Zod), skipping'
      )
      await deps.updateWebhookEvent(row.id, {
        processingError: `payload invalid: ${parsed.error.message}`,
      })
      skippedCount += 1
      continue
    }

    try {
      await deps.processEvent(parsed.data)
      await deps.updateWebhookEvent(row.id, {
        processedAt: new Date(),
        processingError: null,
      })
      successCount += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await deps.updateWebhookEvent(row.id, { processingError: msg })
      deps.logger.error(
        { id: row.id, externalId: row.externalId, err: msg },
        'Webhook reconciliation: still failing'
      )
      failureCount += 1
    }
  }

  if (rows.length > 0) {
    deps.logger.info(
      { total: rows.length, successCount, failureCount, skippedCount },
      'Webhook reconciliation batch complete'
    )
  }
  return { successCount, failureCount, skippedCount }
}

function makeProcessEventCaller(
  redis: IORedis
): (canonical: CanonicalEvent) => Promise<{ processed: boolean }> {
  const repo = new PrismaSubscriptionRepository(prismaAdmin)
  const useCase = new ProcessBillingWebhookEvent(repo)
  return async (canonical: CanonicalEvent) => {
    return useCase.execute(canonical, {
      logger,
      publishInvalidation: async (orgId) => {
        await redis.del(subscriptionCacheKey(orgId))
        await redis.publish(SUBSCRIPTION_INVALIDATION_CHANNEL, orgId)
      },
    })
  }
}

function makeReconciliationDeps(redis: IORedis): ReconciliationDeps {
  const cutoff = () => new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
  return {
    findFailedWebhookEvents: async () =>
      prismaAdmin.webhookEvent.findMany({
        where: {
          source: 'asaas',
          processingError: { not: null },
          processedAt: null,
          receivedAt: { gte: cutoff() },
        },
        orderBy: { receivedAt: 'asc' },
        take: BATCH_LIMIT,
      }),
    updateWebhookEvent: async (id, data) => {
      await prismaAdmin.webhookEvent.update({ where: { id }, data })
    },
    processEvent: makeProcessEventCaller(redis),
    logger,
  }
}

export function setupWebhookReconciliationProcessor(
  connection: ConnectionOptions
) {
  const queue = new Queue(QUEUE_NAME, { connection })
  void queue.upsertJobScheduler(
    'webhook-reconciliation-hourly',
    { pattern: '0 * * * *' },
    { name: 'reconcile-failed-webhooks' }
  )
  const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const deps = makeReconciliationDeps(redis)
      const result = await runReconciliationBatch(deps)
      logger.info(result, 'Webhook reconciliation job completed')
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
    logger.error({ jobId: job?.id, err }, 'Webhook reconciliation job failed')
  })
  return { worker, queue, redis }
}
