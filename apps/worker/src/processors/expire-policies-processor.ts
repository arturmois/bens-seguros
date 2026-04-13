import { prismaAdmin } from '@repo/db'
import type { ConnectionOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'expire-policies-processor' })
const QUEUE_NAME = 'erp-expire-policies'

export function setupExpirePoliciesProcessor(connection: ConnectionOptions) {
  const queue = new Queue(QUEUE_NAME, { connection })

  queue.upsertJobScheduler(
    'expire-policies-daily',
    { pattern: '0 2 * * *' },
    { name: 'expire-active-policies' }
  )

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const result = await prismaAdmin.policy.updateMany({
        where: {
          status: 'ACTIVE',
          endDate: { lt: new Date() },
        },
        data: {
          status: 'EXPIRED',
        },
      })

      logger.info(
        { expiredCount: result.count },
        'Policy expiration job completed'
      )
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
    logger.error({ jobId: job?.id, err }, 'Policy expiration job failed')
  })

  return { worker, queue }
}
