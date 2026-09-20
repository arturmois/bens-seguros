import { describe, expect, it, vi } from 'vitest'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import { ProposalNotFoundError } from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { Proposal } from '../domain/proposal.js'
import { UncompleteChecklistItem } from './uncomplete-checklist-item.js'

function createTestProposal(): Proposal {
  return Proposal.create({
    organizationId: 'org-1',
    contactId: 'c-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'NEW_INSURANCE',
  })
}

function createProposalRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    listForView: vi.fn(),
    listForClient: vi.fn(),
    findActiveByContact: vi.fn().mockResolvedValue([]),
  }
}

function createChecklistRepo(uncompleteResult: unknown): ChecklistRepository {
  return {
    createMany: vi.fn(),
    findByProposal: vi.fn(),
    findById: vi.fn(),
    complete: vi.fn(),
    uncomplete: vi.fn().mockResolvedValue(uncompleteResult),
    getSummary: vi.fn(),
  }
}

describe('UncompleteChecklistItem', () => {
  it('uncompletes a checklist item on existing proposal', async () => {
    const proposal = createTestProposal()
    const expected = {
      id: 'item-1',
      proposalId: proposal.id,
      itemKey: 'doc',
      label: 'Doc',
      isRequired: true,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      createdAt: new Date(),
    }
    const checklistRepo = createChecklistRepo(expected)
    const useCase = new UncompleteChecklistItem(
      checklistRepo,
      createProposalRepo(proposal)
    )
    const result = await useCase.execute('item-1', proposal.id, 'org-1')
    expect(result).toEqual(expected)
    expect(checklistRepo.uncomplete).toHaveBeenCalledWith('item-1', proposal.id)
  })
  it('throws ProposalNotFoundError when proposal absent', async () => {
    const useCase = new UncompleteChecklistItem(
      createChecklistRepo(null),
      createProposalRepo(null)
    )
    await expect(
      useCase.execute('item-1', 'missing', 'org-1')
    ).rejects.toBeInstanceOf(ProposalNotFoundError)
  })
})
