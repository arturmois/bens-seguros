// packages/core/src/modules/proposal/application/create-proposal.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import type {
  PolicyData,
  PolicyRepository,
} from '../../policy/domain/policy-repository.js'
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

function createMockPolicyRepo(
  policy: PolicyData | null = null
): PolicyRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(policy),
    findMany: vi.fn(),
    cancel: vi.fn(),
  }
}

describe('CreateProposal', () => {
  it('creates proposal in CAPTURE stage and saves it', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig()
    const useCase = new CreateProposal(
      repo,
      checklistRepo,
      checklistConfig,
      createMockPolicyRepo()
    )

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
    const useCase = new CreateProposal(
      repo,
      checklistRepo,
      checklistConfig,
      createMockPolicyRepo()
    )

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
    const useCase = new CreateProposal(
      repo,
      checklistRepo,
      checklistConfig,
      createMockPolicyRepo()
    )

    await useCase.execute({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'LIFE',
      boardType: 'NEW_INSURANCE',
    })

    expect(checklistRepo.createMany).not.toHaveBeenCalled()
  })

  it('creates endorsement proposal from an active source policy and copies snapshot data', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig([
      { itemKey: 'BROKER_QUOTE', label: 'Cotação no broker', isRequired: true },
    ])
    const policyRepo = createMockPolicyRepo({
      id: 'pol-1',
      organizationId: 'org-1',
      proposalId: 'proposal-origin',
      clientId: 'client-1',
      salespersonId: 'user-2',
      policyNumber: 'POL-001',
      status: 'ACTIVE',
      branch: 'AUTO',
      premiumValueInCents: 250000,
      coverageDetails: null,
      startDate: new Date('2026-02-01T00:00:00.000Z'),
      endDate: new Date('2027-02-01T00:00:00.000Z'),
      cancelledAt: null,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      insurerId: 'ins-1',
      clientName: 'Maria Souza',
      salespersonName: 'Jainne',
      insurerName: 'Porto',
    })
    const useCase = new CreateProposal(
      repo,
      checklistRepo,
      checklistConfig,
      policyRepo
    )

    const result = await useCase.execute({
      organizationId: 'org-1',
      salespersonId: 'user-1',
      boardType: 'ENDORSEMENT',
      sourcePolicyId: 'pol-1',
      endorsementType: 'COVERAGE_CHANGE',
      endorsementReason: 'Adicionar cobertura para vidros',
    })

    expect(result.stage).toBe('QUOTE')
    expect(result.clientId).toBe('client-1')
    expect(result.branch).toBe('AUTO')
    expect(result.insurerId).toBe('ins-1')
    expect(result.sourcePolicySnapshot?.policyNumber).toBe('POL-001')
    expect(result.sourcePolicySnapshot?.insurerId).toBe('ins-1')
    expect(checklistConfig.getItems).toHaveBeenCalledWith('QUOTE', 'AUTO')
  })

  it('rejects endorsement creation when source policy is not active', async () => {
    const useCase = new CreateProposal(
      createMockRepo(),
      createMockChecklistRepo(),
      createMockChecklistConfig(),
      createMockPolicyRepo({
        id: 'pol-1',
        organizationId: 'org-1',
        clientId: 'client-1',
        salespersonId: 'user-2',
        proposalId: 'proposal-origin',
        policyNumber: 'POL-001',
        status: 'CANCELLED',
        branch: 'AUTO',
        premiumValueInCents: 0,
        coverageDetails: null,
        startDate: new Date(),
        endDate: new Date(),
        cancelledAt: new Date(),
        cancelReason: 'cancelada',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    )

    await expect(
      useCase.execute({
        organizationId: 'org-1',
        salespersonId: 'user-1',
        boardType: 'ENDORSEMENT',
        sourcePolicyId: 'pol-1',
        endorsementType: 'COVERAGE_CHANGE',
        endorsementReason: 'Adicionar cobertura para vidros',
      })
    ).rejects.toThrow('A apólice de origem precisa estar em vigor')
  })

  it('sets quoteValidUntil to 15 days from creation', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig()
    const useCase = new CreateProposal(
      repo,
      checklistRepo,
      checklistConfig,
      createMockPolicyRepo()
    )

    const result = await useCase.execute({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })

    expect(result.quoteValidUntil).toBeInstanceOf(Date)
    const diffMs =
      result.quoteValidUntil!.getTime() - result.createdAt.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(15)
  })
})
