import { describe, it, expect, vi } from 'vitest'
import { AdvanceProposalStage } from './advance-proposal-stage.js'
import { Proposal } from '../domain/proposal.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type {
  ChecklistRepository,
  ChecklistSummary,
} from '../domain/checklist-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import {
  ProposalDetailsRequiredError,
  ChecklistIncompleteError,
} from '../domain/proposal-errors.js'

function createMockRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    findMany: vi.fn(),
  }
}

function createMockChecklistRepo(canAdvance = true): ChecklistRepository {
  const summary: ChecklistSummary = {
    total: 1,
    completed: canAdvance ? 1 : 0,
    required: 1,
    requiredCompleted: canAdvance ? 1 : 0,
    canAdvance,
  }
  return {
    createMany: vi.fn().mockResolvedValue(undefined),
    findByProposal: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    complete: vi.fn(),
    getSummary: vi.fn().mockResolvedValue(summary),
  }
}

function createMockChecklistConfig(): ChecklistConfigProvider {
  return {
    getItems: vi.fn().mockReturnValue([]),
  }
}

describe('AdvanceProposalStage', () => {
  it('advances proposal to next stage', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(true)
    const checklistConfig = createMockChecklistConfig()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig
    )

    const result = await useCase.execute(proposal.id, 'org-1')

    expect(result.stage).toBe('QUOTE')
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })

  it('throws if proposal not found', async () => {
    const repo = createMockRepo(null)
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig
    )

    await expect(useCase.execute('xxx', 'org-1')).rejects.toThrow(
      'não encontrada'
    )
  })

  it('rejects advance from QUOTE without details', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    proposal.advance() // CAPTURE -> QUOTE
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(true)
    const checklistConfig = createMockChecklistConfig()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig
    )

    await expect(useCase.execute(proposal.id, 'org-1')).rejects.toThrow(
      ProposalDetailsRequiredError
    )
  })

  it('rejects advance when checklist has incomplete required items', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    proposal.advance() // CAPTURE -> QUOTE
    // Manually set details so the details guard passes
    proposal.updateDetails(
      {
        branch: 'AUTO',
        brand: 'Toyota',
        model: 'Corolla',
        manufacturingYear: 2020,
        modelYear: 2021,
      },
      150000,
      1500
    )
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(false)
    const checklistConfig = createMockChecklistConfig()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig
    )

    await expect(useCase.execute(proposal.id, 'org-1')).rejects.toThrow(
      ChecklistIncompleteError
    )
  })

  it('does not validate checklist when advancing from CAPTURE stage', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    // Stage is CAPTURE; checklist repo would return canAdvance=false but should not be called
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(false)
    const checklistConfig = createMockChecklistConfig()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig
    )

    const result = await useCase.execute(proposal.id, 'org-1')

    expect(result.stage).toBe('QUOTE')
    expect(checklistRepo.getSummary).not.toHaveBeenCalled()
  })
})
