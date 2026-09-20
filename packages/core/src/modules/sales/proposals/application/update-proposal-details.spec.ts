import { describe, expect, it, vi } from 'vitest'
import type { AutoDetails } from '../domain/insured-object-details.js'
import { InvalidStageTransitionError } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { Proposal } from '../domain/proposal.js'
import { UpdateProposalDetails } from './update-proposal-details.js'

const autoDetails: AutoDetails = {
  branch: 'AUTO',
  vehicle: 'Toyota Corolla',
  manufacturingYear: 2024,
  modelYear: 2025,
}

function createMockRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    listForView: vi.fn(),
    listForClient: vi.fn(),
    markQuoteSent: vi.fn(),
    findActiveByContact: vi.fn().mockResolvedValue([]),
  }
}

describe('UpdateProposalDetails', () => {
  it('updates proposal details', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDetails(repo)
    await useCase.execute(proposal.id, 'org-1', {
      details: autoDetails,
      premiumValueInCents: 150000,
      commissionBasisPoints: 1500,
    })
    expect(proposal.toJSON().details).toEqual(autoDetails)
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
  it('throws if proposal not found', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateProposalDetails(repo)
    await expect(
      useCase.execute('xxx', 'org-1', {
        details: autoDetails,
        premiumValueInCents: 0,
        commissionBasisPoints: 0,
      })
    ).rejects.toThrow('não encontrada')
  })
  it('throws InvalidStageTransitionError when proposal is LOST', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    proposal.markAsLost('cliente desistiu')
    const repo = createMockRepo(proposal)
    const useCase = new UpdateProposalDetails(repo)
    await expect(
      useCase.execute(proposal.id, 'org-1', {
        details: autoDetails,
        premiumValueInCents: 150000,
        commissionBasisPoints: 1500,
      })
    ).rejects.toThrow(InvalidStageTransitionError)
    expect(repo.save).not.toHaveBeenCalled()
  })
})
