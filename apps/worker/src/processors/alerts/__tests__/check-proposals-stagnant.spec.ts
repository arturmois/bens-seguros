import type { NotificationJobData } from '@repo/core/notification'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { checkProposalsStagnant } from '../check-proposals-stagnant.js'

const { hasExistingAlert, memberFindMany } = vi.hoisted(() => ({
  hasExistingAlert: vi.fn().mockResolvedValue(false),
  memberFindMany: vi.fn().mockResolvedValue([]),
}))

vi.mock('../idempotency.js', () => ({ hasExistingAlert }))
vi.mock('@repo/db', () => ({
  prismaAdmin: { member: { findMany: memberFindMany } },
}))

describe('checkProposalsStagnant', () => {
  it('body uses unaccented estagio ha dias', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    const queue = { add } as unknown as Queue<NotificationJobData>
    const logger = { info: vi.fn() } as unknown as Logger
    const updatedAt = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000)
    await checkProposalsStagnant('org-1', queue, logger, {
      now: () => new Date(),
      findStagnant: {
        execute: vi.fn().mockResolvedValue([
          {
            id: 'prop-1',
            salespersonId: 'user-1',
            stage: 'QUOTE',
            updatedAt,
            clientName: 'Maria Silva',
          },
        ]),
      },
    })
    const daysSinceUpdate = Math.floor(
      (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    expect(add).toHaveBeenCalledWith(
      'notification',
      expect.objectContaining({
        notification: expect.objectContaining({
          body: `Proposta de Maria Silva parada no estagio QUOTE ha ${daysSinceUpdate} dias`,
        }),
      }),
      expect.anything()
    )
  })
})
