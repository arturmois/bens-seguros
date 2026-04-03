import { beforeAll, describe, expect, it, vi } from 'vitest'

import { Proposal } from '../domain/proposal.js'

vi.mock('@repo/db', () => ({
  Prisma: {
    DbNull: Symbol('DbNull'),
  },
}))

describe('ProposalMapper', () => {
  let ProposalMapper: typeof import('./proposal-mapper.js').ProposalMapper

  beforeAll(async () => {
    ;({ ProposalMapper } = await import('./proposal-mapper.js'))
  })

  it('rehydrates source policy snapshot dates from persistence', () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'client-1',
      salespersonId: 'user-1',
      branch: 'AUTO',
      boardType: 'ENDORSEMENT',
      sourcePolicyId: 'policy-1',
      endorsementType: 'COVERAGE_CHANGE',
      endorsementReason: 'Adicionar cobertura para vidros',
      sourcePolicySnapshot: {
        policyNumber: 'POL-001',
        clientName: 'Maria Souza',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
        endDate: new Date('2027-02-01T00:00:00.000Z'),
        status: 'ACTIVE',
        insurerId: 'ins-1',
        insurerName: 'Porto',
      },
    })

    const persisted = ProposalMapper.toPersistence(proposal)
    const restored = ProposalMapper.toDomain({
      ...persisted,
      details: null,
      deletedAt: null,
      sourcePolicySnapshot: persisted.sourcePolicySnapshot,
    } as never)

    expect(restored.sourcePolicySnapshot?.startDate).toBeInstanceOf(Date)
    expect(restored.sourcePolicySnapshot?.endDate).toBeInstanceOf(Date)
    expect(restored.sourcePolicySnapshot?.startDate.toISOString()).toBe(
      '2026-02-01T00:00:00.000Z'
    )
    expect(restored.sourcePolicySnapshot?.endDate.toISOString()).toBe(
      '2027-02-01T00:00:00.000Z'
    )
  })

  it('drops invalid source policy snapshot payloads from persistence', () => {
    const restored = ProposalMapper.toDomain({
      id: 'prop-1',
      organizationId: 'org-1',
      clientId: 'client-1',
      salespersonId: 'user-1',
      stage: 'QUOTE',
      boardType: 'ENDORSEMENT',
      branch: 'AUTO',
      premiumValueInCents: 0,
      commissionPercentageInCents: 0,
      details: null,
      lostReason: null,
      renewalPolicyId: null,
      sourcePolicyId: 'policy-1',
      endorsementType: 'COVERAGE_CHANGE',
      endorsementReason: 'Adicionar cobertura para vidros',
      sourcePolicySnapshot: {
        policyNumber: 'POL-001',
        clientName: 'Maria Souza',
        startDate: 'not-a-date',
        endDate: '2027-02-01T00:00:00.000Z',
        status: 'ACTIVE',
        insurerId: 'ins-1',
      },
      insurerId: null,
      deletedAt: null,
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      updatedAt: new Date('2026-02-01T00:00:00.000Z'),
    } as never)

    expect(restored.sourcePolicySnapshot).toBeNull()
  })
})
