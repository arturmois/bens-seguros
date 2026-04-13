import type { NotificationJobData } from '@repo/core/notification'
import { prismaAdmin } from '@repo/db'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { DEFAULT_JOB_OPTIONS } from './constants.js'
import { hasExistingAlert } from './idempotency.js'

const THRESHOLDS = [30, 15, 7] as const

function severityForDays(days: number): string {
  return days <= 7 ? 'CRITICAL' : 'HIGH'
}

export async function checkPoliciesExpiring(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger
): Promise<void> {
  const now = new Date()

  const managers = await prismaAdmin.member.findMany({
    where: {
      organizationId,
      role: { in: ['MANAGER', 'ADMIN', 'OWNER'] },
    },
  })

  for (const days of THRESHOLDS) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + days)

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const policies = await prismaAdmin.policy.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        deletedAt: null,
        endDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        salesperson: true,
        client: true,
      },
    })

    for (const policy of policies) {
      const isDuplicate = await hasExistingAlert({
        organizationId,
        entityType: 'Policy',
        entityId: policy.id,
        type: 'POLICY_EXPIRING',
      })

      if (isDuplicate) {
        continue
      }

      const severity = severityForDays(days)
      const body = `Apolice ${policy.policyNumber} vence em ${days} dias`
      const title =
        severity === 'CRITICAL'
          ? 'Apolice vencendo em breve!'
          : 'Apolice expirando'

      // Notify salesperson
      if (policy.salespersonId) {
        await notificationQueue.add(
          'notification',
          {
            notification: {
              organizationId,
              userId: policy.salespersonId,
              type: 'POLICY_EXPIRING',
              title,
              body,
              entityType: 'Policy',
              entityId: policy.id,
            },
          },
          DEFAULT_JOB_OPTIONS
        )
      }

      // Notify MANAGER/ADMIN/OWNER (excluding salesperson)
      for (const manager of managers) {
        if (manager.userId === policy.salespersonId) {
          continue
        }
        await notificationQueue.add(
          'notification',
          {
            notification: {
              organizationId,
              userId: manager.userId,
              type: 'POLICY_EXPIRING',
              title,
              body,
              entityType: 'Policy',
              entityId: policy.id,
            },
          },
          DEFAULT_JOB_OPTIONS
        )
      }

      logger.info(
        { policyId: policy.id, days, severity },
        'Policy expiry alert enqueued'
      )
    }
  }
}
