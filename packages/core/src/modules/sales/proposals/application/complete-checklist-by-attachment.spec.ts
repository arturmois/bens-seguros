import { describe, expect, it, vi } from 'vitest'
import type {
  ChecklistItemData,
  ChecklistRepository,
} from '../domain/checklist-repository.js'
import { ProposalNotFoundError } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { Proposal } from '../domain/proposal.js'
import { CompleteChecklistByAttachment } from './complete-checklist-by-attachment.js'

function createMockProposalRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    listForView: vi.fn(),
    listForClient: vi.fn(),
    findActiveByContact: vi.fn().mockResolvedValue([]),
  }
}

function createMockChecklistRepo(): ChecklistRepository {
  const completedItem: ChecklistItemData = {
    id: 'item-1',
    proposalId: 'prop-1',
    itemKey: 'CNH',
    label: 'CNH do segurado',
    isRequired: true,
    isCompleted: true,
    completedBy: 'user-1',
    completedAt: new Date(),
    createdAt: new Date(),
  }
  return {
    createMany: vi.fn(),
    findByProposal: vi.fn(),
    findById: vi.fn(),
    complete: vi.fn().mockResolvedValue(completedItem),
    uncomplete: vi.fn(),
    getSummary: vi.fn(),
  }
}

describe('CompleteChecklistByAttachment', () => {
  it('completes checklist item for existing proposal', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    const proposalRepo = createMockProposalRepo(proposal)
    const checklistRepo = createMockChecklistRepo()
    const useCase = new CompleteChecklistByAttachment(
      checklistRepo,
      proposalRepo
    )
    const result = await useCase.execute(
      'item-1',
      proposal.id,
      'org-1',
      'user-1'
    )
    expect(result.isCompleted).toBe(true)
    expect(checklistRepo.complete).toHaveBeenCalledWith(
      'item-1',
      proposal.id,
      'user-1'
    )
  })
  it('throws ProposalNotFoundError when proposal does not exist', async () => {
    const proposalRepo = createMockProposalRepo(null)
    const checklistRepo = createMockChecklistRepo()
    const useCase = new CompleteChecklistByAttachment(
      checklistRepo,
      proposalRepo
    )
    await expect(
      useCase.execute('item-1', 'missing', 'org-1', 'user-1')
    ).rejects.toThrow(ProposalNotFoundError)
    expect(checklistRepo.complete).not.toHaveBeenCalled()
  })
})
