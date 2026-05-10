import { describe, it, expect, vi } from 'vitest'
import { UpdateProposalDates } from './update-proposal-dates.js'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { InvalidCoverageDatesError } from '../domain/proposal-errors.js'

function createTestProposal(): Proposal {
  return Proposal.restore({
    id: 'proposal-1',
    organizationId: 'org-1',
    contactId: 'client-1',
    salespersonId: 'user-1',
    stage: 'QUOTE',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 100000,
    commissionPercentageInCents: 1000,
    details: null,
    lostReason: null,
    renewalPolicyId: null,
    renewalPolicyNumber: null,
    sourcePolicyId: null,
    endorsementType: null,
    endorsementReason: null,
    sourcePolicySnapshot: null,
    insurerId: null,
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    coverageStartDate: null,
    coverageEndDate: null,
    sentToClientAt: null,
    clientResponseAt: null,
    quoteValidUntil: new Date('2026-01-16T00:00:00.000Z'),
  })
}

function createMockRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    findMany: vi.fn(),
  }
}

describe('UpdateProposalDates', () => {
  it('updates coverage start and end dates', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)
    const start = new Date('2026-03-01T00:00:00.000Z')
    const end = new Date('2027-03-01T00:00:00.000Z')
    const result = await useCase.execute('proposal-1', 'org-1', {
      coverageStartDate: start,
      coverageEndDate: end,
    })
    expect(result.coverageStartDate).toEqual(start)
    expect(result.coverageEndDate).toEqual(end)
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
  it('updates clientResponseAt', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)
    const responseDate = new Date('2026-02-10T00:00:00.000Z')
    const result = await useCase.execute('proposal-1', 'org-1', {
      clientResponseAt: responseDate,
    })
    expect(result.clientResponseAt).toEqual(responseDate)
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
  it('updates quoteValidUntil', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)
    const newExpiry = new Date('2026-02-15T00:00:00.000Z')
    const result = await useCase.execute('proposal-1', 'org-1', {
      quoteValidUntil: newExpiry,
    })
    expect(result.quoteValidUntil).toEqual(newExpiry)
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
  it('rejects invalid coverage dates when end is before start', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)
    await expect(
      useCase.execute('proposal-1', 'org-1', {
        coverageStartDate: new Date('2027-01-01T00:00:00.000Z'),
        coverageEndDate: new Date('2026-01-01T00:00:00.000Z'),
      })
    ).rejects.toThrow(InvalidCoverageDatesError)
    expect(repo.save).not.toHaveBeenCalled()
  })
  it('throws when proposal not found', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateProposalDates(repo)
    await expect(
      useCase.execute('nonexistent', 'org-1', {
        quoteValidUntil: new Date(),
      })
    ).rejects.toThrow('não encontrada')
  })
  it('updates multiple date fields in a single call', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)
    const start = new Date('2026-04-01T00:00:00.000Z')
    const end = new Date('2027-04-01T00:00:00.000Z')
    const responseDate = new Date('2026-03-20T00:00:00.000Z')
    const newExpiry = new Date('2026-03-31T00:00:00.000Z')
    const result = await useCase.execute('proposal-1', 'org-1', {
      coverageStartDate: start,
      coverageEndDate: end,
      clientResponseAt: responseDate,
      quoteValidUntil: newExpiry,
    })
    expect(result.coverageStartDate).toEqual(start)
    expect(result.coverageEndDate).toEqual(end)
    expect(result.clientResponseAt).toEqual(responseDate)
    expect(result.quoteValidUntil).toEqual(newExpiry)
    expect(repo.save).toHaveBeenCalledTimes(1)
  })
  it('updates only coverageEndDate when proposal already has a start date', async () => {
    const existingStart = new Date('2026-03-01T00:00:00.000Z')
    const proposal = Proposal.restore({
      id: 'proposal-1',
      organizationId: 'org-1',
      contactId: 'client-1',
      salespersonId: 'user-1',
      stage: 'QUOTE',
      boardType: 'NEW_INSURANCE',
      branch: 'AUTO',
      premiumValueInCents: 100000,
      commissionPercentageInCents: 1000,
      details: null,
      lostReason: null,
      renewalPolicyId: null,
      renewalPolicyNumber: null,
      sourcePolicyId: null,
      endorsementType: null,
      endorsementReason: null,
      sourcePolicySnapshot: null,
      insurerId: null,
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      coverageStartDate: existingStart,
      coverageEndDate: null,
      sentToClientAt: null,
      clientResponseAt: null,
      quoteValidUntil: new Date('2026-01-16T00:00:00.000Z'),
    })
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDates(repo)
    const newEnd = new Date('2027-03-01T00:00:00.000Z')
    const result = await useCase.execute('proposal-1', 'org-1', {
      coverageEndDate: newEnd,
    })
    expect(result.coverageStartDate).toEqual(existingStart)
    expect(result.coverageEndDate).toEqual(newEnd)
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
})
