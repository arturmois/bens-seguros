import { FindPendingCommissions, PrismaCommissionRepository } from '@repo/core'
import type { NotificationJobData } from '@repo/core/notification'
import { prismaAdmin } from '@repo/db'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { DEFAULT_JOB_OPTIONS } from './constants.js'
import { hasExistingAlert } from './idempotency.js'

const PENDING_DAYS = 7

export interface CheckCommissionsPendingDeps {
  findPending: Pick<FindPendingCommissions, 'execute'>
  now: () => Date
}

export async function checkCommissionsPending(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger,
  deps?: CheckCommissionsPendingDeps
): Promise<void> {
  const now = deps?.now ?? (() => new Date())
  const findPending =
    deps?.findPending ??
    new FindPendingCommissions(new PrismaCommissionRepository(prismaAdmin))
  const admins = await prismaAdmin.member.findMany({
    where: {
      organizationId,
      role: { in: ['ADMIN', 'OWNER'] },
    },
  })
  const commissions = await findPending.execute({
    organizationId,
    now: now(),
    days: PENDING_DAYS,
  })
  for (const commission of commissions) {
    const isDuplicate = await hasExistingAlert({
      organizationId,
      entityType: 'Commission',
      entityId: commission.id,
      type: 'COMMISSION_PENDING',
    })
    if (isDuplicate) {
      continue
    }
    const daysPending = Math.floor(
      (Date.now() - commission.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const body = `Comissão da apólice ${commission.policyNumber} pendente há ${daysPending} dias`
    await notificationQueue.add(
      'notification',
      {
        notification: {
          organizationId,
          userId: commission.salespersonId,
          type: 'COMMISSION_PENDING',
          title: 'Comissão pendente',
          body,
          entityType: 'Commission',
          entityId: commission.id,
        },
      },
      DEFAULT_JOB_OPTIONS
    )
    for (const admin of admins) {
      if (admin.userId === commission.salespersonId) {
        continue
      }
      await notificationQueue.add(
        'notification',
        {
          notification: {
            organizationId,
            userId: admin.userId,
            type: 'COMMISSION_PENDING',
            title: 'Comissão pendente',
            body,
            entityType: 'Commission',
            entityId: commission.id,
          },
        },
        DEFAULT_JOB_OPTIONS
      )
    }
    logger.info(
      { commissionId: commission.id, daysPending },
      'Commission pending alert enqueued'
    )
  }
}
