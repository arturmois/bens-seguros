import {
  PrismaNotificationRepository,
  ResendEmailProvider,
  type CreateNotificationInput,
  type EmailProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { ConnectionOptions, Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'notification-processor' })

const QUEUE_NAME = 'erp-notifications'

export interface NotificationJobData {
  readonly notification: CreateNotificationInput
  readonly email?: {
    readonly to: string
    readonly subject: string
    readonly html: string
  }
}

export function setupNotificationProcessor(connection: ConnectionOptions) {
  const queue = new Queue<NotificationJobData>(QUEUE_NAME, { connection })
  const repo = new PrismaNotificationRepository(prisma)

  let emailProvider: EmailProvider | null = null
  if (process.env.RESEND_API_KEY) {
    emailProvider = new ResendEmailProvider(process.env.RESEND_API_KEY)
  }

  const worker = new Worker<NotificationJobData>(
    QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
      const { notification, email } = job.data

      // Create in-app notification
      const created = await repo.create(notification)

      // Send email if payload provided and provider configured
      if (email && emailProvider) {
        try {
          await emailProvider.send(email)
          await prisma.notification.update({
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
    { connection, concurrency: 5 }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Notification job failed')
  })

  return { worker, queue }
}
