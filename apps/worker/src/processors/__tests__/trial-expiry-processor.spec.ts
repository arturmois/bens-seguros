import { describe, expect, it, vi } from 'vitest'

import {
  runTrialExpiryBatch,
  type TrialExpiryDeps,
} from '../trial-expiry-processor.js'

function silentLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

interface TrialRowShape {
  id: string
  organizationId: string
  trialEndsAt: Date | null
}

function makeRow(overrides: Partial<TrialRowShape> = {}): TrialRowShape {
  return {
    id: 'sub_1',
    organizationId: 'org_1',
    trialEndsAt: new Date('2026-05-20T00:00:00Z'),
    ...overrides,
  }
}

function makeDeps(overrides: Partial<TrialExpiryDeps> = {}): TrialExpiryDeps {
  return {
    now: () => new Date('2026-05-27T12:00:00Z'),
    findExpiredTrials: vi.fn().mockResolvedValue([]),
    expireTrial: vi.fn().mockResolvedValue(undefined),
    invalidateCache: vi.fn().mockResolvedValue(undefined),
    logger: silentLogger(),
    ...overrides,
  }
}

describe('runTrialExpiryBatch', () => {
  it('returns zeros and skips updates when no trials are expired', async () => {
    const deps = makeDeps()
    const result = await runTrialExpiryBatch(deps)
    expect(result).toEqual({ expiredCount: 0, failureCount: 0 })
    expect(deps.expireTrial).not.toHaveBeenCalled()
    expect(deps.invalidateCache).not.toHaveBeenCalled()
  })

  it('expires a single trial and invalidates cache', async () => {
    const row = makeRow()
    const expireTrial = vi.fn().mockResolvedValue(undefined)
    const invalidateCache = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      findExpiredTrials: vi.fn().mockResolvedValue([row]),
      expireTrial,
      invalidateCache,
    })
    const result = await runTrialExpiryBatch(deps)
    expect(result).toEqual({ expiredCount: 1, failureCount: 0 })
    expect(expireTrial).toHaveBeenCalledWith(
      row,
      new Date('2026-05-27T12:00:00Z')
    )
    expect(invalidateCache).toHaveBeenCalledWith('org_1')
  })

  it('expires multiple trials in order', async () => {
    const rows = [
      makeRow({ id: 'sub_1', organizationId: 'org_1' }),
      makeRow({ id: 'sub_2', organizationId: 'org_2' }),
      makeRow({ id: 'sub_3', organizationId: 'org_3' }),
    ]
    const expireTrial = vi.fn().mockResolvedValue(undefined)
    const invalidateCache = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      findExpiredTrials: vi.fn().mockResolvedValue(rows),
      expireTrial,
      invalidateCache,
    })
    const result = await runTrialExpiryBatch(deps)
    expect(result).toEqual({ expiredCount: 3, failureCount: 0 })
    expect(expireTrial).toHaveBeenCalledTimes(3)
    expect(invalidateCache).toHaveBeenCalledTimes(3)
  })

  it('counts failure when expireTrial throws but continues batch', async () => {
    const rows = [
      makeRow({ id: 'sub_1', organizationId: 'org_1' }),
      makeRow({ id: 'sub_2', organizationId: 'org_2' }),
    ]
    const expireTrial = vi
      .fn()
      .mockRejectedValueOnce(new Error('DB timeout'))
      .mockResolvedValueOnce(undefined)
    const invalidateCache = vi.fn().mockResolvedValue(undefined)
    const logger = silentLogger()
    const deps = makeDeps({
      findExpiredTrials: vi.fn().mockResolvedValue(rows),
      expireTrial,
      invalidateCache,
      logger,
    })
    const result = await runTrialExpiryBatch(deps)
    expect(result).toEqual({ expiredCount: 1, failureCount: 1 })
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(invalidateCache).toHaveBeenCalledTimes(1)
    expect(invalidateCache).toHaveBeenCalledWith('org_2')
  })

  it('skips invalidateCache when expireTrial fails for a row', async () => {
    const row = makeRow()
    const expireTrial = vi.fn().mockRejectedValue(new Error('write failed'))
    const invalidateCache = vi.fn().mockResolvedValue(undefined)
    const deps = makeDeps({
      findExpiredTrials: vi.fn().mockResolvedValue([row]),
      expireTrial,
      invalidateCache,
    })
    const result = await runTrialExpiryBatch(deps)
    expect(result.failureCount).toBe(1)
    expect(invalidateCache).not.toHaveBeenCalled()
  })

  it('passes now to findExpiredTrials so the filter is testable', async () => {
    const findExpiredTrials = vi.fn().mockResolvedValue([])
    const deps = makeDeps({
      now: () => new Date('2027-01-01T00:00:00Z'),
      findExpiredTrials,
    })
    await runTrialExpiryBatch(deps)
    expect(findExpiredTrials).toHaveBeenCalledWith(
      new Date('2027-01-01T00:00:00Z')
    )
  })
})
