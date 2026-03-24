import {
  policyExpiringEmail,
  type NotificationJobData,
} from '@repo/core/notification'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import type { ConnectionOptions } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'policy-expiry-processor' })

const QUEUE_NAME = 'erp-policy-expiry'
const EXPIRY_DAYS = 30

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR')
}

export function setupPolicyExpiryProcessor(
  connection: ConnectionOptions,
  notificationQueue: Queue<NotificationJobData>
) {
  const queue = new Queue(QUEUE_NAME, { connection })

  queue.upsertJobScheduler(
    'policy-expiry-daily',
    { pattern: '0 8 * * *' },
    { name: 'check-expiring-policies' }
  )

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const now = new Date()
      const cutoff = new Date(now)
      cutoff.setDate(cutoff.getDate() + EXPIRY_DAYS)

      const expiringPolicies = await prisma.policy.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: now,
            lte: cutoff,
          },
          deletedAt: null,
        },
        include: {
          salesperson: true,
          client: true,
        },
      })

      if (expiringPolicies.length === 0) {
        logger.info('No policies expiring in next 30 days')
        return
      }

      const frontendUrl = env.FRONTEND_URL

      for (const policy of expiringPolicies) {
        const daysUntilExpiry = Math.ceil(
          (policy.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Notify salesperson
        if (policy.salesperson) {
          const emailHtml = policyExpiringEmail({
            userName: policy.salesperson.name,
            policyNumber: policy.policyNumber,
            clientName: policy.client?.name ?? 'N/A',
            expirationDate: formatDate(policy.endDate),
            daysUntilExpiry,
            frontendUrl,
          })

          await notificationQueue.add(
            'notification',
            {
              notification: {
                organizationId: policy.organizationId,
                userId: policy.salespersonId,
                type: 'POLICY_EXPIRING',
                title: 'Apolice expirando',
                body: `Apolice ${policy.policyNumber} vence em ${daysUntilExpiry} dias`,
                entityType: 'Policy',
                entityId: policy.id,
              },
              email: policy.salesperson.email
                ? {
                    to: policy.salesperson.email,
                    subject: `Apolice ${policy.policyNumber} expira em ${daysUntilExpiry} dias`,
                    html: emailHtml,
                  }
                : undefined,
            },
            DEFAULT_JOB_OPTIONS
          )
        }

        // Notify managers
        const managers = await prisma.member.findMany({
          where: {
            organizationId: policy.organizationId,
            role: { in: ['MANAGER', 'ADMIN', 'OWNER'] },
          },
          include: { user: true },
        })

        for (const manager of managers) {
          if (manager.userId === policy.salespersonId) continue

          await notificationQueue.add(
            'notification',
            {
              notification: {
                organizationId: policy.organizationId,
                userId: manager.userId,
                type: 'POLICY_EXPIRING',
                title: 'Apolice expirando',
                body: `Apolice ${policy.policyNumber} vence em ${daysUntilExpiry} dias`,
                entityType: 'Policy',
                entityId: policy.id,
              },
            },
            DEFAULT_JOB_OPTIONS
          )
        }
      }

      logger.info(
        { count: expiringPolicies.length },
        'Policy expiry notifications enqueued'
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
    logger.error({ jobId: job?.id, err }, 'Policy expiry job failed')
  })

  return { worker, queue }
}
