import type { NotificationJobData } from '@repo/core/notification'
import { prismaAdmin } from '@repo/db'
import type { ConnectionOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'
import { checkClaimsStalled } from './check-claims-stalled.js'
import { checkCommissionsPending } from './check-commissions-pending.js'
import { checkPoliciesExpiring } from './check-policy-expiry.js'
import { checkProposalsStagnant } from './check-proposals-stagnant.js'

const logger = pino({ name: 'proactive-alerts-processor' })

const QUEUE_NAME = 'erp-proactive-alerts'

export function setupProactiveAlertsProcessor(
  connection: ConnectionOptions,
  notificationQueue: Queue<NotificationJobData>
) {
  const queue = new Queue(QUEUE_NAME, { connection })
  queue.upsertJobScheduler(
    'proactive-alerts-daily',
    { pattern: '0 8 * * *' },
    { name: 'check-all-alerts' }
  )
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      logger.info('Starting proactive alerts check')
      const organizations = await prismaAdmin.organization.findMany({
        select: { id: true },
      })
      for (const org of organizations) {
        const orgLogger = logger.child({ organizationId: org.id })
        try {
          await checkPoliciesExpiring(org.id, notificationQueue, orgLogger)
        } catch (err: unknown) {
          orgLogger.error({ err }, 'Policy expiry check failed')
        }
        try {
          await checkClaimsStalled(org.id, notificationQueue, orgLogger)
        } catch (err: unknown) {
          orgLogger.error({ err }, 'Claims stalled check failed')
        }
        try {
          await checkCommissionsPending(org.id, notificationQueue, orgLogger)
        } catch (err: unknown) {
          orgLogger.error({ err }, 'Commissions pending check failed')
        }
        try {
          await checkProposalsStagnant(org.id, notificationQueue, orgLogger)
        } catch (err: unknown) {
          orgLogger.error({ err }, 'Proposals stagnant check failed')
        }
        orgLogger.info('Completed all checks for organization')
      }
      logger.info(
        { organizationCount: organizations.length },
        'Proactive alerts check completed'
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
    logger.error({ jobId: job?.id, err }, 'Proactive alerts job failed')
  })
  return { worker, queue }
}
