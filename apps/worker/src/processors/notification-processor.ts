import {
  PrismaNotificationRepository,
  ResendEmailProvider,
  type EmailProvider,
  type NotificationJobData,
} from '@repo/core/notification'
import { prismaAdmin } from '@repo/db'
import { env } from '@repo/env'
import type { ConnectionOptions, Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'notification-processor' })

const QUEUE_NAME = 'erp-notifications'

export function setupNotificationProcessor(connection: ConnectionOptions) {
  const queue = new Queue<NotificationJobData>(QUEUE_NAME, { connection })
  const repo = new PrismaNotificationRepository(prismaAdmin)
  let emailProvider: EmailProvider | null = null
  if (env.RESEND_API_KEY) {
    emailProvider = new ResendEmailProvider({
      apiKey: env.RESEND_API_KEY,
      fromAddress: env.RESEND_FROM_ADDRESS,
    })
  }
  const worker = new Worker<NotificationJobData>(
    QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
      const { notification, email } = job.data
      const created = await repo.create(notification)
      if (email && emailProvider) {
        try {
          await emailProvider.send(email)
          await prismaAdmin.notification.update({
            where: { id: created.id },
            data: { emailSent: true },
          })
        } catch (err: unknown) {
          logger.error(
            { err, notificationId: created.id },
            'Failed to send email notification'
          )
        }
      }
      logger.info(
        {
          notificationId: created.id,
          type: notification.type,
          userId: notification.userId,
          emailSent: Boolean(email && emailProvider),
        },
        'Notification processed'
      )
    },
    {
      connection,
      concurrency: 5,
      maxStalledCount: 2,
      stalledInterval: 5_000,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86_400 },
    }
  )
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Notification job failed')
  })
  return { worker, queue }
}
