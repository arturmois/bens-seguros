import { describe, expect, it, vi } from 'vitest'
import {
  CannotSendQuoteForLostProposalError,
  ClientHasNoEmailError,
  ProposalNotFoundError,
} from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { Proposal } from '../domain/proposal.js'
import { SendQuote } from './send-quote.js'

function createTestProposal(stage: Proposal['stage'] = 'QUOTE'): Proposal {
  return Proposal.restore({
    id: 'proposal-1',
    organizationId: 'org-1',
    contactId: 'client-1',
    salespersonId: 'user-1',
    stage,
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
    listForView: vi.fn(),
  }
}

describe('SendQuote', () => {
  it('validates and returns proposal when client has email', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new SendQuote(repo)
    const result = await useCase.validate(
      'proposal-1',
      'org-1',
      'client@example.com'
    )
    expect(result).toBe(proposal)
    expect(repo.findById).toHaveBeenCalledWith('proposal-1', 'org-1')
  })
  it('rejects when proposal not found', async () => {
    const repo = createMockRepo(null)
    const useCase = new SendQuote(repo)
    await expect(
      useCase.validate('nonexistent', 'org-1', 'client@example.com')
    ).rejects.toThrow(ProposalNotFoundError)
  })
  it('rejects when client has no email', async () => {
    const proposal = createTestProposal()
    const repo = createMockRepo(proposal)
    const useCase = new SendQuote(repo)
    await expect(useCase.validate('proposal-1', 'org-1', null)).rejects.toThrow(
      ClientHasNoEmailError
    )
  })
  it('rejects when proposal is LOST', async () => {
    const proposal = createTestProposal('LOST')
    const repo = createMockRepo(proposal)
    const useCase = new SendQuote(repo)
    await expect(
      useCase.validate('proposal-1', 'org-1', 'client@example.com')
    ).rejects.toThrow(CannotSendQuoteForLostProposalError)
  })
})
