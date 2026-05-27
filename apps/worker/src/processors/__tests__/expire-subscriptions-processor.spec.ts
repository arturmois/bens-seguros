import { describe, expect, it, vi } from 'vitest'

import {
  runExpireSubscriptionsBatch,
  type ExpireSubscriptionsDeps,
} from '../expire-subscriptions-processor.js'

function silentLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

type RowShape = {
  id: string
  organizationId: string
  currentPeriodEnd: Date
}

function makeRow(overrides: Partial<RowShape> = {}): RowShape {
  return {
    id: 'sub_1',
    organizationId: 'org_1',
    currentPeriodEnd: new Date('2026-05-20T00:00:00Z'),
    ...overrides,
  }
}

function makeDeps(
  overrides: Partial<ExpireSubscriptionsDeps> = {}
): ExpireSubscriptionsDeps {
  return {
    now: () => new Date('2026-05-27T12:00:00Z'),
    findCanceledExpired: vi.fn().mockResolvedValue([]),
    expireSubscription: vi.fn().mockResolvedValue(undefined),
    invalidateCache: vi.fn().mockResolvedValue(undefined),
    logger: silentLogger(),
    ...overrides,
  }
}

describe('runExpireSubscriptionsBatch', () => {
  it('returns zeros and skips updates when no rows are due', async () => {
    const deps = makeDeps()
    const result = await runExpireSubscriptionsBatch(deps)
    expect(result).toEqual({ expiredCount: 0, failureCount: 0 })
    expect(deps.expireSubscription).not.toHaveBeenCalled()
    expect(deps.invalidateCache).not.toHaveBeenCalled()
  })

  it('expires a single canceled subscription past currentPeriodEnd', async () => {
    const row = makeRow()
    const expireSubscription = vi.fn().mockResolvedValue(undefined)
    const invalidateCache = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      findCanceledExpired: vi.fn().mockResolvedValue([row]),
      expireSubscription,
      invalidateCache,
    })
    const result = await runExpireSubscriptionsBatch(deps)
    expect(result).toEqual({ expiredCount: 1, failureCount: 0 })
    expect(expireSubscription).toHaveBeenCalledWith(
      row,
      new Date('2026-05-27T12:00:00Z')
    )
    expect(invalidateCache).toHaveBeenCalledWith('org_1')
  })

  it('processes multiple rows', async () => {
    const rows = [
      makeRow({ id: 'sub_1', organizationId: 'org_1' }),
      makeRow({ id: 'sub_2', organizationId: 'org_2' }),
    ]
    const deps = makeDeps({
      findCanceledExpired: vi.fn().mockResolvedValue(rows),
    })
    const result = await runExpireSubscriptionsBatch(deps)
    expect(result).toEqual({ expiredCount: 2, failureCount: 0 })
    expect(deps.expireSubscription).toHaveBeenCalledTimes(2)
    expect(deps.invalidateCache).toHaveBeenCalledTimes(2)
  })

  it('isolates failures and continues batch', async () => {
    const rows = [
      makeRow({ id: 'sub_1' }),
      makeRow({ id: 'sub_2', organizationId: 'org_2' }),
    ]
    const expireSubscription = vi
      .fn()
      .mockRejectedValueOnce(new Error('DB write failed'))
      .mockResolvedValueOnce(undefined)
    const logger = silentLogger()
    const deps = makeDeps({
      findCanceledExpired: vi.fn().mockResolvedValue(rows),
      expireSubscription,
      logger,
    })
    const result = await runExpireSubscriptionsBatch(deps)
    expect(result).toEqual({ expiredCount: 1, failureCount: 1 })
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(deps.invalidateCache).toHaveBeenCalledTimes(1)
    expect(deps.invalidateCache).toHaveBeenCalledWith('org_2')
  })

  it('does not invalidate cache when expireSubscription fails', async () => {
    const row = makeRow()
    const deps = makeDeps({
      findCanceledExpired: vi.fn().mockResolvedValue([row]),
      expireSubscription: vi.fn().mockRejectedValue(new Error('boom')),
    })
    const result = await runExpireSubscriptionsBatch(deps)
    expect(result.failureCount).toBe(1)
    expect(deps.invalidateCache).not.toHaveBeenCalled()
  })

  it('passes now to findCanceledExpired so the filter is testable', async () => {
    const findCanceledExpired = vi.fn().mockResolvedValue([])
    const deps = makeDeps({
      now: () => new Date('2027-12-31T00:00:00Z'),
      findCanceledExpired,
    })
    await runExpireSubscriptionsBatch(deps)
    expect(findCanceledExpired).toHaveBeenCalledWith(
      new Date('2027-12-31T00:00:00Z')
    )
  })
})
