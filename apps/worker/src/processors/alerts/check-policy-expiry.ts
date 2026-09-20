import { FindExpiringPolicies, PrismaPolicyRepository } from '@repo/core'
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

export interface CheckPoliciesExpiringDeps {
  findExpiring: Pick<FindExpiringPolicies, 'execute'>
  now: () => Date
}

export async function checkPoliciesExpiring(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger,
  deps?: CheckPoliciesExpiringDeps
): Promise<void> {
  const now = deps?.now ?? (() => new Date())
  const findExpiring =
    deps?.findExpiring ??
    new FindExpiringPolicies(new PrismaPolicyRepository(prismaAdmin))
  const managers = await prismaAdmin.member.findMany({
    where: {
      organizationId,
      role: { in: ['MANAGER', 'ADMIN', 'OWNER'] },
    },
  })
  const windows = await findExpiring.execute({
    organizationId,
    now: now(),
    thresholds: THRESHOLDS,
  })
  for (const window of windows) {
    const days = window.days
    for (const policy of window.policies) {
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
