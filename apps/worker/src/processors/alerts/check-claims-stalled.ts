import type { NotificationJobData } from '@repo/core/notification'
import { prisma } from '@repo/db'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { DEFAULT_JOB_OPTIONS } from './constants.js'
import { hasExistingAlert } from './idempotency.js'

const STALLED_DAYS = 7
const STALLED_STATUSES = [
  'REGISTERED',
  'IN_ANALYSIS',
  'AWAITING_DOCUMENT',
  'PENDING_INSPECTION',
] as const

export async function checkClaimsStalled(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger
): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - STALLED_DAYS)

  const managers = await prisma.member.findMany({
    where: {
      organizationId,
      role: { in: ['MANAGER', 'ADMIN', 'OWNER'] },
    },
  })

  const claims = await prisma.claim.findMany({
    where: {
      organizationId,
      status: { in: [...STALLED_STATUSES] },
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
  })

  for (const claim of claims) {
    const isDuplicate = await hasExistingAlert({
      organizationId,
      entityType: 'Claim',
      entityId: claim.id,
      type: 'CLAIM_STALLED',
    })

    if (isDuplicate) {
      continue
    }

    const daysSinceUpdate = Math.floor(
      (Date.now() - claim.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const body = `Sinistro #${claim.claimNumber} sem atualizacao ha ${daysSinceUpdate} dias`

    // Notify assignedTo if set
    if (claim.assignedToId) {
      await notificationQueue.add(
        'notification',
        {
          notification: {
            organizationId,
            userId: claim.assignedToId,
            type: 'CLAIM_STALLED',
            title: 'Sinistro parado',
            body,
            entityType: 'Claim',
            entityId: claim.id,
          },
        },
        DEFAULT_JOB_OPTIONS
      )
    }

    // Notify MANAGERs
    for (const manager of managers) {
      if (manager.userId === claim.assignedToId) {
        continue
      }
      await notificationQueue.add(
        'notification',
        {
          notification: {
            organizationId,
            userId: manager.userId,
            type: 'CLAIM_STALLED',
            title: 'Sinistro parado',
            body,
            entityType: 'Claim',
            entityId: claim.id,
          },
        },
        DEFAULT_JOB_OPTIONS
      )
    }

    logger.info(
      { claimId: claim.id, daysSinceUpdate },
      'Claim stalled alert enqueued'
    )
  }
}
