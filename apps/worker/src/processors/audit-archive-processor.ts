import { prismaAdmin, Prisma } from '@repo/db'
import type { ConnectionOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'audit-archive-processor' })

const BATCH_SIZE = 10_000
const QUEUE_NAME = 'erp-audit-archive'

export function setupAuditArchiveProcessor(connection: ConnectionOptions) {
  const queue = new Queue(QUEUE_NAME, { connection })
  queue.upsertJobScheduler(
    'audit-archive-monthly',
    { pattern: '0 3 1 * *' },
    { name: 'archive-old-audit-logs' }
  )
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const cutoffDate = new Date()
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1)
      let archived = 0
      let hasMore = true
      while (hasMore) {
        const logs = await prismaAdmin.auditLog.findMany({
          where: { createdAt: { lt: cutoffDate } },
          take: BATCH_SIZE,
        })
        if (logs.length === 0) {
          hasMore = false
          break
        }
        const archiveData: Prisma.AuditLogArchiveCreateManyInput[] = logs.map(
          (log) => ({
            id: log.id,
            organizationId: log.organizationId,
            userId: log.userId,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            before: log.before ?? Prisma.JsonNull,
            after: log.after ?? Prisma.JsonNull,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            createdAt: log.createdAt,
            archivedAt: new Date(),
          })
        )
        await prismaAdmin.$transaction([
          prismaAdmin.auditLogArchive.createMany({ data: archiveData }),
          prismaAdmin.auditLog.deleteMany({
            where: { id: { in: logs.map((l) => l.id) } },
          }),
        ])
        archived += logs.length
        hasMore = logs.length === BATCH_SIZE
      }
      logger.info({ archived }, 'Audit log archive completed')
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
    logger.error({ jobId: job?.id, err }, 'Audit archive job failed')
  })
  return { worker, queue }
}
