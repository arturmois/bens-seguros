import type { NotificationJobData } from '@repo/core/notification'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { checkClaimsStalled } from '../check-claims-stalled.js'

const { hasExistingAlert, memberFindMany } = vi.hoisted(() => ({
  hasExistingAlert: vi.fn().mockResolvedValue(false),
  memberFindMany: vi.fn().mockResolvedValue([]),
}))

vi.mock('../idempotency.js', () => ({ hasExistingAlert }))
vi.mock('@repo/db', () => ({
  prismaAdmin: { member: { findMany: memberFindMany } },
}))

describe('checkClaimsStalled', () => {
  it('body uses unaccented atualizacao ha dias', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    const queue = { add } as unknown as Queue<NotificationJobData>
    const logger = { info: vi.fn() } as unknown as Logger
    const updatedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    await checkClaimsStalled('org-1', queue, logger, {
      now: () => new Date(),
      findStalled: {
        execute: vi.fn().mockResolvedValue([
          {
            id: 'claim-1',
            assignedToId: 'user-1',
            updatedAt,
            claimNumber: 42,
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
          body: `Sinistro #42 sem atualizacao ha ${daysSinceUpdate} dias`,
        }),
      }),
      expect.anything()
    )
  })
})
