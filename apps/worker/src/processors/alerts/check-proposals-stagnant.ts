import type { NotificationJobData } from '@repo/core/notification'
import { prisma } from '@repo/db'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { hasExistingAlert } from './idempotency.js'

const STAGNANT_DAYS = 15
const TERMINAL_STAGES = ['POLICY_ISSUED', 'LOST'] as const

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
}

export async function checkProposalsStagnant(
  organizationId: string,
  notificationQueue: Queue<NotificationJobData>,
  logger: Logger
): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - STAGNANT_DAYS)

  const proposals = await prisma.proposal.findMany({
    where: {
      organizationId,
      stage: { notIn: [...TERMINAL_STAGES] },
      deletedAt: null,
      updatedAt: { lt: cutoff },
    },
    include: {
      client: true,
    },
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
    const clientName = proposal.client?.name ?? 'N/A'
    const body = `Proposta de ${clientName} parada no estagio ${proposal.stage} ha ${daysSinceUpdate} dias`

    // Notify salesperson
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

    // Notify MANAGERs
    const managers = await prisma.member.findMany({
      where: {
        organizationId,
        role: 'MANAGER',
      },
    })

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
