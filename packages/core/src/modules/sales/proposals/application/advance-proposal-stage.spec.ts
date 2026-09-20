import { describe, expect, it, vi } from 'vitest'
import type {
  ContactData,
  ContactRepository,
} from '../../leads/domain/contact-repository.js' // ContactRepository lives in sales/leads;
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import type {
  ChecklistRepository,
  ChecklistSummary,
} from '../domain/checklist-repository.js'
import {
  ChecklistIncompleteError,
  ContactNotPromotedError,
  ProposalDetailsRequiredError,
} from '../domain/proposal-errors.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { Proposal } from '../domain/proposal.js'
import { AdvanceProposalStage } from './advance-proposal-stage.js'
import { AutoCompleteChecklistItems } from './auto-complete-checklist-items.js'

function createMockRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    listForView: vi.fn(),
    findActiveByContact: vi.fn().mockResolvedValue([]),
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
    uncomplete: vi.fn(),
    getSummary: vi.fn().mockResolvedValue(summary),
  }
}

function createMockChecklistConfig(): ChecklistConfigProvider {
  return {
    getItems: vi.fn().mockReturnValue([]),
  }
}

function makeContact(overrides: Partial<ContactData> = {}): ContactData {
  const now = new Date()
  return {
    id: 'contact-1',
    organizationId: 'org-1',
    name: 'Maria Souza',
    phone: '11999999999',
    email: 'maria@example.com',
    source: 'MANUAL',
    salespersonId: 'user-2',
    clientId: 'client-1',
    tags: [],
    socialMedia: null,
    notes: null,
    consentLgpd: true,
    birthDate: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function createMockContactRepo(
  contact: ContactData | null = null
): ContactRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(contact),
    findByIdWithStage: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  }
}

function createMockAutoComplete(): AutoCompleteChecklistItems {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as AutoCompleteChecklistItems
}

function makeProposalAtPayment(): Proposal {
  const proposal = Proposal.create({
    organizationId: 'org-1',
    contactId: 'contact-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'NEW_INSURANCE',
  })
  proposal.advance()
  proposal.updateDetails(
    {
      branch: 'AUTO',
      vehicle: 'Toyota Corolla',
      manufacturingYear: 2020,
      modelYear: 2021,
    },
    150000,
    1500
  )
  proposal.advance()
  proposal.advance()
  proposal.advance()
  return proposal
}

describe('AdvanceProposalStage', () => {
  it('advances proposal to next stage', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(true)
    const checklistConfig = createMockChecklistConfig()
    const contactRepo = createMockContactRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    const result = await useCase.execute(proposal.id, 'org-1')
    expect(result.stage).toBe('QUOTE')
    expect(repo.save).toHaveBeenCalledWith(proposal)
  })
  it('throws if proposal not found', async () => {
    const repo = createMockRepo(null)
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig()
    const contactRepo = createMockContactRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    await expect(useCase.execute('xxx', 'org-1')).rejects.toThrow(
      'não encontrada'
    )
  })
  it('rejects advance from QUOTE without details', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    proposal.advance()
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(true)
    const checklistConfig = createMockChecklistConfig()
    const contactRepo = createMockContactRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    await expect(useCase.execute(proposal.id, 'org-1')).rejects.toThrow(
      ProposalDetailsRequiredError
    )
  })
  it('rejects advance when checklist has incomplete required items', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    proposal.advance()
    proposal.updateDetails(
      {
        branch: 'AUTO',
        vehicle: 'Toyota Corolla',
        manufacturingYear: 2020,
        modelYear: 2021,
      },
      150000,
      1500
    )
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(false)
    const checklistConfig = createMockChecklistConfig()
    const contactRepo = createMockContactRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    await expect(useCase.execute(proposal.id, 'org-1')).rejects.toThrow(
      ChecklistIncompleteError
    )
  })
  it('advances proposal from PAYMENT to POLICY_ISSUED when contact is promoted', async () => {
    const proposal = makeProposalAtPayment()
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(true)
    const checklistConfig = createMockChecklistConfig()
    const contactRepo = createMockContactRepo(
      makeContact({ clientId: 'client-1' })
    )
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    const result = await useCase.execute(proposal.id, 'org-1')
    expect(result.stage).toBe('POLICY_ISSUED')
    expect(repo.save).toHaveBeenCalledWith(proposal)
    expect(contactRepo.findById).toHaveBeenCalledWith('contact-1', 'org-1')
    expect(checklistConfig.getItems).not.toHaveBeenCalled()
  })
  it('rejects advance from PAYMENT to POLICY_ISSUED when contact is not promoted', async () => {
    const proposal = makeProposalAtPayment()
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(true)
    const checklistConfig = createMockChecklistConfig()
    const contactRepo = createMockContactRepo(makeContact({ clientId: null }))
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    await expect(useCase.execute(proposal.id, 'org-1')).rejects.toThrow(
      ContactNotPromotedError
    )
    expect(repo.save).not.toHaveBeenCalled()
  })
  it('rejects advance from PAYMENT to POLICY_ISSUED when contact is missing', async () => {
    const proposal = makeProposalAtPayment()
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(true)
    const checklistConfig = createMockChecklistConfig()
    const contactRepo = createMockContactRepo(null)
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    await expect(useCase.execute(proposal.id, 'org-1')).rejects.toThrow(
      ContactNotPromotedError
    )
    expect(repo.save).not.toHaveBeenCalled()
  })
  it('does not validate checklist when advancing from CAPTURE stage', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(false)
    const checklistConfig = createMockChecklistConfig()
    const contactRepo = createMockContactRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    const result = await useCase.execute(proposal.id, 'org-1')
    expect(result.stage).toBe('QUOTE')
    expect(checklistRepo.getSummary).not.toHaveBeenCalled()
  })
  it('does not check contact promotion when advancing to non-POLICY_ISSUED stages', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(true)
    const checklistConfig = createMockChecklistConfig()
    const contactRepo = createMockContactRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    await useCase.execute(proposal.id, 'org-1')
    expect(contactRepo.findById).not.toHaveBeenCalled()
  })
  it('runs auto-detection after regenerating checklist on stage advance', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    const repo = createMockRepo(proposal)
    const checklistRepo = createMockChecklistRepo(true)
    const checklistConfig = createMockChecklistConfig()
    checklistConfig.getItems = vi.fn().mockReturnValue([
      { itemKey: 'client_data', label: 'Dados do cliente', isRequired: true },
      {
        itemKey: 'driver_license',
        label: 'CNH do condutor',
        isRequired: true,
      },
    ])
    const contactRepo = createMockContactRepo()
    const autoComplete = createMockAutoComplete()
    const useCase = new AdvanceProposalStage(
      repo,
      checklistRepo,
      checklistConfig,
      contactRepo,
      autoComplete
    )
    await useCase.execute(proposal.id, 'org-1')
    expect(checklistRepo.createMany).toHaveBeenCalledTimes(1)
    expect(autoComplete.execute).toHaveBeenCalledTimes(3)
    expect(autoComplete.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      proposalId: proposal.id,
      itemKey: 'client_data',
    })
    expect(autoComplete.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      proposalId: proposal.id,
      itemKey: 'driver_license',
    })
    expect(autoComplete.execute).toHaveBeenCalledWith({
      organizationId: 'org-1',
      proposalId: proposal.id,
      itemKey: 'vehicle_registration',
    })
    const createManyMock = checklistRepo.createMany as ReturnType<typeof vi.fn>
    const autoCompleteMock = autoComplete.execute as ReturnType<typeof vi.fn>
    const createManyOrder = createManyMock.mock.invocationCallOrder[0] ?? 0
    const autoCompleteOrder = autoCompleteMock.mock.invocationCallOrder[0] ?? 0
    expect(createManyOrder).toBeGreaterThan(0)
    expect(autoCompleteOrder).toBeGreaterThan(createManyOrder)
  })
})
