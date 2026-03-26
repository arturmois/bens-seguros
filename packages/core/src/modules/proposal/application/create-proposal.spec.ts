// packages/core/src/modules/proposal/application/create-proposal.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import { CreateProposal } from './create-proposal.js'

function createMockRepo(): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findMany: vi.fn(),
  }
}

function createMockChecklistRepo(): ChecklistRepository {
  return {
    createMany: vi.fn(),
    findByProposal: vi.fn(),
    findById: vi.fn(),
    complete: vi.fn(),
    getSummary: vi.fn(),
  }
}

function createMockChecklistConfig(
  items: Array<{ itemKey: string; label: string; isRequired: boolean }> = []
): ChecklistConfigProvider {
  return {
    getItems: vi.fn().mockReturnValue(items),
  }
}

describe('CreateProposal', () => {
  it('creates proposal in CAPTURE stage and saves it', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig()
    const useCase = new CreateProposal(repo, checklistRepo, checklistConfig)

    const result = await useCase.execute({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })

    expect(result.stage).toBe('CAPTURE')
    expect(result.organizationId).toBe('org-1')
    expect(result.branch).toBe('AUTO')
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('creates checklist items when config returns items for stage/branch', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig([
      { itemKey: 'CNH', label: 'CNH do segurado', isRequired: true },
      { itemKey: 'CRLV', label: 'CRLV do veiculo', isRequired: true },
    ])
    const useCase = new CreateProposal(repo, checklistRepo, checklistConfig)

    await useCase.execute({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })

    expect(checklistConfig.getItems).toHaveBeenCalledWith('CAPTURE', 'AUTO')
    expect(checklistRepo.createMany).toHaveBeenCalledWith(expect.any(String), [
      { itemKey: 'CNH', label: 'CNH do segurado', isRequired: true },
      { itemKey: 'CRLV', label: 'CRLV do veiculo', isRequired: true },
    ])
  })

  it('skips checklist creation when config returns no items', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig([])
    const useCase = new CreateProposal(repo, checklistRepo, checklistConfig)

    await useCase.execute({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'LIFE',
      boardType: 'NEW_INSURANCE',
    })

    expect(checklistRepo.createMany).not.toHaveBeenCalled()
  })
})
