import { Worker, Queue } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'
import { prisma, Prisma } from '@repo/db'
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
        const logs = await prisma.auditLog.findMany({
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

        await prisma.$transaction([
          prisma.auditLogArchive.createMany({ data: archiveData }),
          prisma.auditLog.deleteMany({
            where: { id: { in: logs.map((l) => l.id) } },
          }),
        ])

        archived += logs.length
        hasMore = logs.length === BATCH_SIZE
      }

      logger.info({ archived }, 'Audit log archive completed')
    },
    { connection }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Audit archive job failed')
  })

  return { worker, queue }
}
