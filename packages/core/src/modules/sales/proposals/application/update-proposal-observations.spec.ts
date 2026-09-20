import { describe, expect, it, vi } from 'vitest'
import { ProposalNotFoundError } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { Proposal } from '../domain/proposal.js'
import { UpdateProposalObservations } from './update-proposal-observations.js'

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
    observations: null,
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
    quoteValidUntil: null,
  })
}

function createMockRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    listForView: vi.fn(),
    listForClient: vi.fn(),
    markQuoteSent: vi.fn(),
    findStagnant: vi.fn(),
    findActiveByContact: vi.fn().mockResolvedValue([]),
  }
}

describe('UpdateProposalObservations', () => {
  it('updates observations on existing proposal', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalObservations(repo)
    const result = await useCase.execute(
      'proposal-1',
      'org-1',
      'Cliente pediu desconto de 10%'
    )
    expect(result.observations).toBe('Cliente pediu desconto de 10%')
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
  it('clears observations when given null', async () => {
    const proposal = createTestProposal()
    proposal.updateObservations('initial')
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalObservations(repo)
    const result = await useCase.execute('proposal-1', 'org-1', null)
    expect(result.observations).toBeNull()
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
  it('throws ProposalNotFoundError when proposal absent', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateProposalObservations(repo)
    await expect(
      useCase.execute('missing', 'org-1', 'note')
    ).rejects.toBeInstanceOf(ProposalNotFoundError)
    expect(repo.save).not.toHaveBeenCalled()
  })
})
