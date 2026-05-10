import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReopenProposal } from './reopen-proposal.js'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'

function createMockRepo(): ProposalRepository {
  return {
    findById: vi.fn(),
    save: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  } as unknown as ProposalRepository
}

describe('ReopenProposal', () => {
  let useCase: ReopenProposal
  let repo: ProposalRepository
  beforeEach(() => {
    repo = createMockRepo()
    useCase = new ReopenProposal(repo)
  })
  it('reopens a LOST proposal back to CAPTURE', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'client-1',
      salespersonId: 'sp-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    proposal.markAsLost('Cliente desistiu')
    vi.mocked(repo.findById).mockResolvedValue(proposal)
    vi.mocked(repo.save).mockResolvedValue(undefined)
    await useCase.execute(proposal.id, 'org-1')
    expect(proposal.stage).toBe('CAPTURE')
    expect(proposal.toJSON().lostReason).toBeNull()
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
  it('reopens a LOST endorsement proposal back to QUOTE', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'client-1',
      salespersonId: 'sp-1',
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
    proposal.markAsLost('Cliente desistiu')
    vi.mocked(repo.findById).mockResolvedValue(proposal)
    vi.mocked(repo.save).mockResolvedValue(undefined)
    await useCase.execute(proposal.id, 'org-1')
    expect(proposal.stage).toBe('QUOTE')
    expect(proposal.toJSON().lostReason).toBeNull()
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
  it('throws when proposal is not LOST', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'client-1',
      salespersonId: 'sp-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    vi.mocked(repo.findById).mockResolvedValue(proposal)
    await expect(useCase.execute(proposal.id, 'org-1')).rejects.toThrow(
      'reabrir'
    )
  })
  it('throws ProposalNotFoundError when not found', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null)
    await expect(useCase.execute('nope', 'org-1')).rejects.toThrow()
  })
})
