import type { NotificationJobData } from '@repo/core/notification'
import type { Queue } from 'bullmq'
import type { Logger } from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { checkPoliciesExpiring } from '../check-policy-expiry.js'

const { hasExistingAlert, memberFindMany } = vi.hoisted(() => ({
  hasExistingAlert: vi.fn().mockResolvedValue(false),
  memberFindMany: vi.fn().mockResolvedValue([]),
}))

vi.mock('../idempotency.js', () => ({ hasExistingAlert }))
vi.mock('@repo/db', () => ({
  prismaAdmin: { member: { findMany: memberFindMany } },
}))

describe('checkPoliciesExpiring', () => {
  it('title Apolice vencendo em breve when days is 7 else Apolice expirando', async () => {
    const add = vi.fn().mockResolvedValue(undefined)
    const queue = { add } as unknown as Queue<NotificationJobData>
    const logger = { info: vi.fn() } as unknown as Logger
    await checkPoliciesExpiring('org-1', queue, logger, {
      now: () => new Date(),
      findExpiring: {
        execute: vi.fn().mockResolvedValue([
          {
            days: 7,
            policies: [
              {
                id: 'pol-7',
                policyNumber: '1007',
                salespersonId: 'user-1',
              },
            ],
          },
          {
            days: 15,
            policies: [
              {
                id: 'pol-15',
                policyNumber: '1015',
                salespersonId: 'user-1',
              },
            ],
          },
        ]),
      },
    })
    const titles = add.mock.calls.map(
      (call) =>
        (call[1] as { notification: { title: string; body: string } })
          .notification.title
    )
    const bodies = add.mock.calls.map(
      (call) =>
        (call[1] as { notification: { title: string; body: string } })
          .notification.body
    )
    expect(titles).toContain('Apolice vencendo em breve!')
    expect(titles).toContain('Apolice expirando')
    expect(bodies).toContain('Apolice 1007 vence em 7 dias')
    expect(bodies).toContain('Apolice 1015 vence em 15 dias')
  })
})
