import { Worker, Queue } from 'bullmq';
import type IORedis from 'ioredis';
import { prisma } from '@repo/db';
import pino from 'pino';

const logger = pino({ name: 'audit-archive-processor' });

const BATCH_SIZE = 10_000;
const QUEUE_NAME = 'erp-audit-archive';

export function setupAuditArchiveProcessor(connection: IORedis) {
  const queue = new Queue(QUEUE_NAME, { connection });

  queue.upsertJobScheduler(
    'audit-archive-monthly',
    { pattern: '0 3 1 * *' },
    { name: 'archive-old-audit-logs' },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);

      let archived = 0;
      let hasMore = true;

      while (hasMore) {
        const logs = await prisma.auditLog.findMany({
          where: { createdAt: { lt: cutoffDate } },
          take: BATCH_SIZE,
        });

        if (logs.length === 0) {
          hasMore = false;
          break;
        }

        await prisma.$transaction([
          prisma.auditLogArchive.createMany({
            data: logs.map((log) => ({
              ...log,
              archivedAt: new Date(),
            })),
          }),
          prisma.auditLog.deleteMany({
            where: { id: { in: logs.map((l) => l.id) } },
          }),
        ]);

        archived += logs.length;
        hasMore = logs.length === BATCH_SIZE;
      }

      logger.info({ archived }, 'Audit log archive completed');
    },
    { connection },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Audit archive job failed');
  });

  return { worker, queue };
}
