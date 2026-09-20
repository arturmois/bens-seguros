import { FindStalledClaims, PrismaClaimRepository } from '@repo/core'
import type { NotificationJobData } from '@repo/core/notification'
import { prismaAdmin } from '@repo/db'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { DEFAULT_JOB_OPTIONS } from './constants.js'
import { hasExistingAlert } from './idempotency.js'

const STALLED_DAYS = 7

export interface CheckClaimsStalledDeps {
  findStalled: Pick<FindStalledClaims, 'execute'>
  now: () => Date
}

export async function checkClaimsStalled(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger,
  deps?: CheckClaimsStalledDeps
): Promise<void> {
  const now = deps?.now ?? (() => new Date())
  const findStalled =
    deps?.findStalled ??
    new FindStalledClaims(new PrismaClaimRepository(prismaAdmin))
  const managers = await prismaAdmin.member.findMany({
    where: {
      organizationId,
      role: { in: ['MANAGER', 'ADMIN', 'OWNER'] },
    },
  })
  const claims = await findStalled.execute({
    organizationId,
    now: now(),
    days: STALLED_DAYS,
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
