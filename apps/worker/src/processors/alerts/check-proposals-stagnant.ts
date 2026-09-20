import { FindStagnantProposals, PrismaProposalRepository } from '@repo/core'
import type { NotificationJobData } from '@repo/core/notification'
import { prismaAdmin } from '@repo/db'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { DEFAULT_JOB_OPTIONS } from './constants.js'
import { hasExistingAlert } from './idempotency.js'

const STAGNANT_DAYS = 15

export interface CheckProposalsStagnantDeps {
  findStagnant: Pick<FindStagnantProposals, 'execute'>
  now: () => Date
}

export async function checkProposalsStagnant(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger,
  deps?: CheckProposalsStagnantDeps
): Promise<void> {
  const now = deps?.now ?? (() => new Date())
  const findStagnant =
    deps?.findStagnant ??
    new FindStagnantProposals(new PrismaProposalRepository(prismaAdmin))
  const managers = await prismaAdmin.member.findMany({
    where: {
      organizationId,
      role: { in: ['MANAGER', 'ADMIN', 'OWNER'] },
    },
  })
  const proposals = await findStagnant.execute({
    organizationId,
    now: now(),
    days: STAGNANT_DAYS,
  })
  for (const proposal of proposals) {
    const isDuplicate = await hasExistingAlert({
      organizationId,
      entityType: 'Proposal',
      entityId: proposal.id,
      type: 'PROPOSAL_STAGNANT',
    })
    if (isDuplicate) {
      continue
    }
    const daysSinceUpdate = Math.floor(
      (Date.now() - proposal.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const body = `Proposta de ${proposal.clientName} parada no estagio ${proposal.stage} ha ${daysSinceUpdate} dias`
    await notificationQueue.add(
      'notification',
      {
        notification: {
          organizationId,
          userId: proposal.salespersonId,
          type: 'PROPOSAL_STAGNANT',
          title: 'Proposta estagnada',
          body,
          entityType: 'Proposal',
          entityId: proposal.id,
        },
      },
      DEFAULT_JOB_OPTIONS
    )
    for (const manager of managers) {
      if (manager.userId === proposal.salespersonId) {
        continue
      }
      await notificationQueue.add(
        'notification',
        {
          notification: {
            organizationId,
            userId: manager.userId,
            type: 'PROPOSAL_STAGNANT',
            title: 'Proposta estagnada',
            body,
            entityType: 'Proposal',
            entityId: proposal.id,
          },
        },
        DEFAULT_JOB_OPTIONS
      )
    }
    logger.info(
      { proposalId: proposal.id, daysSinceUpdate, stage: proposal.stage },
      'Proposal stagnant alert enqueued'
    )
  }
}
