// packages/core/src/modules/proposal/application/mark-proposal-lost.spec.ts
import { describe, expect, it, vi } from 'vitest'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import {
  ProposalNotFoundError,
  InvalidStageTransitionError,
} from '../domain/proposal-errors.js'
import { MarkProposalLost } from './mark-proposal-lost.js'

function createMockRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    findMany: vi.fn(),
  }
}

function makeProposal(
  stage:
    | 'CAPTURE'
    | 'QUOTE'
    | 'PROTOCOL'
    | 'INSPECTION'
    | 'PAYMENT'
    | 'POLICY_ISSUED'
    | 'LOST' = 'CAPTURE'
): Proposal {
  const proposal = Proposal.create({
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'NEW_INSURANCE',
  })
  // Advance to desired stage
  const stages = [
    'CAPTURE',
    'QUOTE',
    'PROTOCOL',
    'INSPECTION',
    'PAYMENT',
    'POLICY_ISSUED',
  ]
  const targetIndex = stages.indexOf(stage)
  for (let i = 0; i < targetIndex; i++) {
    proposal.advance()
  }
  return proposal
}

describe('MarkProposalLost', () => {
  it('marks CAPTURE proposal as lost with reason', async () => {
    const proposal = makeProposal('CAPTURE')
    const repo = createMockRepo(proposal)
    const useCase = new MarkProposalLost(repo)

    const result = await useCase.execute(
      proposal.id,
      'org-1',
      'Cliente desistiu'
    )

    expect(result.stage).toBe('LOST')
    expect(result.lostReason).toBe('Cliente desistiu')
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })

  it('marks QUOTE proposal as lost', async () => {
    const proposal = makeProposal('QUOTE')
    const repo = createMockRepo(proposal)
    const useCase = new MarkProposalLost(repo)

    const result = await useCase.execute(proposal.id, 'org-1', 'Preco alto')

    expect(result.stage).toBe('LOST')
  })

  it('rejects marking POLICY_ISSUED as lost', async () => {
    const proposal = makeProposal('POLICY_ISSUED')
    const repo = createMockRepo(proposal)
    const useCase = new MarkProposalLost(repo)

    await expect(
      useCase.execute(proposal.id, 'org-1', 'reason')
    ).rejects.toThrow(InvalidStageTransitionError)
  })

  it('throws ProposalNotFoundError when proposal does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new MarkProposalLost(repo)

    await expect(useCase.execute('missing', 'org-1', 'reason')).rejects.toThrow(
      ProposalNotFoundError
    )
    expect(repo.save).not.toHaveBeenCalled()
  })
})
