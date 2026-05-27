import { describe, expect, it, vi } from 'vitest'

import { runDunningBatch, type DunningDeps } from '../dunning-processor.js'

function silentLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

interface PastDueRowShape {
  id: string
  organizationId: string
  oldestOverdueDueDate: Date
}

function makeRow(overrides: Partial<PastDueRowShape> = {}): PastDueRowShape {
  return {
    id: 'sub_1',
    organizationId: 'org_1',
    oldestOverdueDueDate: new Date('2026-05-15T00:00:00Z'),
    ...overrides,
  }
}

function makeDeps(overrides: Partial<DunningDeps> = {}): DunningDeps {
  return {
    now: () => new Date('2026-05-27T12:00:00Z'),
    findPastDueForExpiry: vi.fn().mockResolvedValue([]),
    expirePastDue: vi.fn().mockResolvedValue(undefined),
    invalidateCache: vi.fn().mockResolvedValue(undefined),
    logger: silentLogger(),
    ...overrides,
  }
}

describe('runDunningBatch', () => {
  it('returns zeros and skips updates when no past-due subscriptions are due for expiry', async () => {
    const deps = makeDeps()
    const result = await runDunningBatch(deps)
    expect(result).toEqual({ expiredCount: 0, failureCount: 0 })
    expect(deps.expirePastDue).not.toHaveBeenCalled()
    expect(deps.invalidateCache).not.toHaveBeenCalled()
  })

  it('expires a single past-due subscription and invalidates cache', async () => {
    const row = makeRow()
    const expirePastDue = vi.fn().mockResolvedValue(undefined)
    const invalidateCache = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      findPastDueForExpiry: vi.fn().mockResolvedValue([row]),
      expirePastDue,
      invalidateCache,
    })
    const result = await runDunningBatch(deps)
    expect(result).toEqual({ expiredCount: 1, failureCount: 0 })
    expect(expirePastDue).toHaveBeenCalledWith(
      row,
      new Date('2026-05-27T12:00:00Z')
    )
    expect(invalidateCache).toHaveBeenCalledWith('org_1')
  })

  it('expires multiple past-due subscriptions in order', async () => {
    const rows = [
      makeRow({ id: 'sub_1', organizationId: 'org_1' }),
      makeRow({ id: 'sub_2', organizationId: 'org_2' }),
      makeRow({ id: 'sub_3', organizationId: 'org_3' }),
    ]
    const expirePastDue = vi.fn().mockResolvedValue(undefined)
    const invalidateCache = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      findPastDueForExpiry: vi.fn().mockResolvedValue(rows),
      expirePastDue,
      invalidateCache,
    })
    const result = await runDunningBatch(deps)
    expect(result).toEqual({ expiredCount: 3, failureCount: 0 })
    expect(expirePastDue).toHaveBeenCalledTimes(3)
    expect(invalidateCache).toHaveBeenCalledTimes(3)
  })

  it('counts failure when expirePastDue throws but continues batch', async () => {
    const rows = [
      makeRow({ id: 'sub_1', organizationId: 'org_1' }),
      makeRow({ id: 'sub_2', organizationId: 'org_2' }),
    ]
    const expirePastDue = vi
      .fn()
      .mockRejectedValueOnce(new Error('DB timeout'))
      .mockResolvedValueOnce(undefined)
    const invalidateCache = vi.fn().mockResolvedValue(undefined)
    const logger = silentLogger()
    const deps = makeDeps({
      findPastDueForExpiry: vi.fn().mockResolvedValue(rows),
      expirePastDue,
      invalidateCache,
      logger,
    })
    const result = await runDunningBatch(deps)
    expect(result).toEqual({ expiredCount: 1, failureCount: 1 })
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(invalidateCache).toHaveBeenCalledTimes(1)
    expect(invalidateCache).toHaveBeenCalledWith('org_2')
  })

  it('skips invalidateCache when expirePastDue fails for a row', async () => {
    const row = makeRow()
    const expirePastDue = vi.fn().mockRejectedValue(new Error('write failed'))
    const invalidateCache = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      findPastDueForExpiry: vi.fn().mockResolvedValue([row]),
      expirePastDue,
      invalidateCache,
    })
    const result = await runDunningBatch(deps)
    expect(result.failureCount).toBe(1)
    expect(invalidateCache).not.toHaveBeenCalled()
  })

  it('passes now to findPastDueForExpiry so the cutoff is testable', async () => {
    const findPastDueForExpiry = vi.fn().mockResolvedValue([])
    const deps = makeDeps({
      now: () => new Date('2027-01-01T00:00:00Z'),
      findPastDueForExpiry,
    })
    await runDunningBatch(deps)
    expect(findPastDueForExpiry).toHaveBeenCalledWith(
      new Date('2027-01-01T00:00:00Z')
    )
  })
})
