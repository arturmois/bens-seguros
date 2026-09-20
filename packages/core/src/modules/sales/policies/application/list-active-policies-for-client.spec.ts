import { describe, expect, it, vi } from 'vitest'
import type { ContactRepository } from '../../leads/domain/contact-repository.js'
import type {
  PolicyData,
  PolicyRepository,
} from '../domain/policy-repository.js'
import { ListActivePoliciesForClient } from './list-active-policies-for-client.js'

function policy(id: string, status: PolicyData['status']): PolicyData {
  return {
    id,
    organizationId: 'org-1',
    proposalId: 'prop-1',
    clientId: 'client-1',
    salespersonId: 'user-1',
    insurerId: null,
    policyNumber: '1001',
    status,
    branch: 'AUTO',
    premiumValueInCents: 1000,
    coverageDetails: null,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('ListActivePoliciesForClient', () => {
  it('returns at most 10 ACTIVE policies with policyNumber string', async () => {
    const contactRepo = { findByPhone: vi.fn() } as unknown as ContactRepository
    const listActiveForClient = vi
      .fn()
      .mockResolvedValue(
        Array.from({ length: 15 }, (_, index) =>
          policy(`pol-${String(index)}`, 'ACTIVE')
        )
      )
    const policyRepo = { listActiveForClient } as unknown as PolicyRepository
    const useCase = new ListActivePoliciesForClient(contactRepo, policyRepo)
    const result = await useCase.execute({
      organizationId: 'org-1',
      clientId: 'client-1',
    })
    expect(listActiveForClient).toHaveBeenCalledWith({
      organizationId: 'org-1',
      clientId: 'client-1',
      limit: 10,
    })
    expect(result.policies).toHaveLength(10)
    expect(result.policies.every((item) => item.status === 'ACTIVE')).toBe(true)
    expect(typeof result.policies[0]?.policyNumber).toBe('string')
  })
})
