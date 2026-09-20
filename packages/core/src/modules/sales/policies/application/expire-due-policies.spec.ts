import { describe, expect, it, vi } from 'vitest'
import type { PolicyRepository } from '../domain/policy-repository.js'
import { ExpireDuePolicies } from './expire-due-policies.js'

describe('ExpireDuePolicies', () => {
  it('updateMany ACTIVE endDate lt now to EXPIRED without organizationId', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 })
    const policyRepo = { updateMany } as Pick<PolicyRepository, 'updateMany'>
    const useCase = new ExpireDuePolicies(policyRepo)
    const now = new Date('2026-09-20T12:00:00.000Z')
    const result = await useCase.execute({ now })
    expect(updateMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', endDate: { lt: now } },
      data: { status: 'EXPIRED' },
    })
    const args = updateMany.mock.calls[0]?.[0]
    expect(args).toBeDefined()
    expect(Object.hasOwn(args.where, 'organizationId')).toBe(false)
    expect(Object.hasOwn(args, 'organizationId')).toBe(false)
    expect(result).toEqual({ count: 3 })
  })
})
