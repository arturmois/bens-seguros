import { describe, expect, it, vi } from 'vitest'
import type {
  ContactRepository,
  ContactWithStage,
} from '../../leads/domain/contact-repository.js' // ContactRepository lives in sales/leads;
import type {
  PolicyData,
  PolicyRepository,
} from '../../policies/domain/policy-repository.js'
import type { ChecklistConfigProvider } from '../domain/checklist-config.js'
import type { ChecklistRepository } from '../domain/checklist-repository.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { AutoCompleteChecklistItems } from './auto-complete-checklist-items.js'
import { CreateProposal } from './create-proposal.js'

function createMockRepo(): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    listForView: vi.fn(),
    listForClient: vi.fn(),
    markQuoteSent: vi.fn(),
    findActiveByContact: vi.fn().mockResolvedValue([]),
  }
}

function createMockChecklistRepo(): ChecklistRepository {
  return {
    createMany: vi.fn(),
    findByProposal: vi.fn(),
    findById: vi.fn(),
    complete: vi.fn(),
    uncomplete: vi.fn(),
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
    findByPolicyNumber: vi.fn().mockResolvedValue(policy),
    listActiveForClient: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
    cancel: vi.fn(),
  }
}

function createMockContactRepo(
  contacts: ContactWithStage[] = []
): ContactRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByIdWithStage: vi.fn(),
    findByPhone: vi.fn(),
    findMany: vi.fn().mockResolvedValue({ items: contacts, nextCursor: null }),
    update: vi.fn(),
    softDelete: vi.fn(),
  }
}

function createMockAutoComplete(): AutoCompleteChecklistItems {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as AutoCompleteChecklistItems
}

function makeContact(
  id: string,
  clientId: string,
  organizationId = 'org-1'
): ContactWithStage {
  const now = new Date()
  return {
    id,
    organizationId,
    name: 'Maria Souza',
    phone: '11999999999',
    email: 'maria@example.com',
    source: 'MANUAL',
    salespersonId: 'user-2',
    clientId,
    tags: [],
    socialMedia: null,
    notes: null,
    consentLgpd: true,
    birthDate: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    stage: 'CLIENT_ACTIVE',
    activePolicyCount: 1,
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
      createMockPolicyRepo(),
      createMockContactRepo(),
      createMockAutoComplete()
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      contactId: 'c-1',
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
      createMockPolicyRepo(),
      createMockContactRepo(),
      createMockAutoComplete()
    )
    await useCase.execute({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    expect(checklistConfig.getItems).toHaveBeenCalledWith('CAPTURE', 'AUTO')
    expect(checklistRepo.createMany).toHaveBeenCalledWith(
      expect.any(String),
      'org-1',
      [
        { itemKey: 'CNH', label: 'CNH do segurado', isRequired: true },
        { itemKey: 'CRLV', label: 'CRLV do veiculo', isRequired: true },
      ]
    )
  })
  it('skips checklist creation when config returns no items', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig([])
    const useCase = new CreateProposal(
      repo,
      checklistRepo,
      checklistConfig,
      createMockPolicyRepo(),
      createMockContactRepo(),
      createMockAutoComplete()
    )
    await useCase.execute({
      organizationId: 'org-1',
      contactId: 'c-1',
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
    const oldestContact = makeContact('contact-oldest', 'client-1')
    const contactRepo = createMockContactRepo([oldestContact])
    const useCase = new CreateProposal(
      repo,
      checklistRepo,
      checklistConfig,
      policyRepo,
      contactRepo,
      createMockAutoComplete()
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
    expect(result.contactId).toBe('contact-oldest')
    expect(result.branch).toBe('AUTO')
    expect(result.insurerId).toBe('ins-1')
    expect(result.toJSON().sourcePolicySnapshot?.policyNumber).toBe('POL-001')
    expect(result.toJSON().sourcePolicySnapshot?.insurerId).toBe('ins-1')
    expect(checklistConfig.getItems).toHaveBeenCalledWith('QUOTE', 'AUTO')
    expect(contactRepo.findMany).toHaveBeenCalledWith(
      { organizationId: 'org-1', clientId: 'client-1' },
      { limit: 1, sortBy: 'createdAt', sortOrder: 'asc' }
    )
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
        insurerId: null,
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
      }),
      createMockContactRepo(),
      createMockAutoComplete()
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
  it('rejects endorsement creation when source policy client has no contact', async () => {
    const policyRepo = createMockPolicyRepo({
      id: 'pol-1',
      organizationId: 'org-1',
      proposalId: 'proposal-origin',
      clientId: 'client-99',
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
    })
    const contactRepo = createMockContactRepo([])
    const useCase = new CreateProposal(
      createMockRepo(),
      createMockChecklistRepo(),
      createMockChecklistConfig(),
      policyRepo,
      contactRepo,
      createMockAutoComplete()
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
    ).rejects.toThrow('não tem contato vinculado')
  })
  it('sets quoteValidUntil to 15 days from creation', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig()
    const useCase = new CreateProposal(
      repo,
      checklistRepo,
      checklistConfig,
      createMockPolicyRepo(),
      createMockContactRepo(),
      createMockAutoComplete()
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      contactId: 'c-1',
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
  it('resolves renewalPolicyId when renewalPolicyNumber matches an existing policy', async () => {
    const policyRepo = createMockPolicyRepo()
    const matchedPolicy: PolicyData = {
      id: 'pol-existing',
      organizationId: 'org-1',
      proposalId: 'prop-old',
      clientId: 'client-1',
      salespersonId: 'user-1',
      policyNumber: 'POL-2025-001',
      status: 'ACTIVE',
      branch: 'AUTO',
      premiumValueInCents: 150000,
      coverageDetails: null,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2026-01-01'),
      cancelledAt: null,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      insurerId: null,
    }
    vi.mocked(policyRepo.findByPolicyNumber).mockResolvedValue(matchedPolicy)
    const useCase = new CreateProposal(
      createMockRepo(),
      createMockChecklistRepo(),
      createMockChecklistConfig(),
      policyRepo,
      createMockContactRepo(),
      createMockAutoComplete()
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'RENEWAL',
      renewalPolicyNumber: 'POL-2025-001',
    })
    expect(result.toJSON().renewalPolicyNumber).toBe('POL-2025-001')
    expect(result.toJSON().renewalPolicyId).toBe('pol-existing')
    expect(policyRepo.findByPolicyNumber).toHaveBeenCalledWith(
      'POL-2025-001',
      'org-1'
    )
  })
  it('stores renewalPolicyNumber without link when policy number does not exist', async () => {
    const policyRepo = createMockPolicyRepo()
    vi.mocked(policyRepo.findByPolicyNumber).mockResolvedValue(null)
    const useCase = new CreateProposal(
      createMockRepo(),
      createMockChecklistRepo(),
      createMockChecklistConfig(),
      policyRepo,
      createMockContactRepo(),
      createMockAutoComplete()
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'RENEWAL',
      renewalPolicyNumber: 'POL-EXTERNAL-999',
    })
    expect(result.toJSON().renewalPolicyNumber).toBe('POL-EXTERNAL-999')
    expect(result.toJSON().renewalPolicyId).toBeNull()
  })
  it('creates renewal without renewalPolicyNumber preserving current behavior', async () => {
    const useCase = new CreateProposal(
      createMockRepo(),
      createMockChecklistRepo(),
      createMockChecklistConfig(),
      createMockPolicyRepo(),
      createMockContactRepo(),
      createMockAutoComplete()
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      contactId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'RENEWAL',
    })
    expect(result.toJSON().renewalPolicyNumber).toBeNull()
    expect(result.toJSON().renewalPolicyId).toBeNull()
  })
  it('createMany is called with client_data Dados do cliente isRequired true', async () => {
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig([
      { itemKey: 'client_data', label: 'Dados do cliente', isRequired: true },
    ])
    const useCase = new CreateProposal(
      createMockRepo(),
      checklistRepo,
      checklistConfig,
      createMockPolicyRepo(),
      createMockContactRepo(),
      createMockAutoComplete()
    )
    await useCase.execute({
      organizationId: 'org-1',
      salespersonId: 'u-1',
      contactId: 'c-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    expect(checklistRepo.createMany).toHaveBeenCalledWith(
      expect.any(String),
      'org-1',
      [
        {
          itemKey: 'client_data',
          label: 'Dados do cliente',
          isRequired: true,
        },
      ]
    )
  })
  it('runs auto-detection for the 3 keys after initial checklist creation', async () => {
    const repo = createMockRepo()
    const checklistRepo = createMockChecklistRepo()
    const checklistConfig = createMockChecklistConfig([
      { itemKey: 'client_data', label: 'Dados do cliente', isRequired: true },
    ])
    const autoComplete = createMockAutoComplete()
    const useCase = new CreateProposal(
      repo,
      checklistRepo,
      checklistConfig,
      createMockPolicyRepo(),
      createMockContactRepo(),
      autoComplete
    )
    await useCase.execute({
      organizationId: 'org-1',
      salespersonId: 'u-1',
      contactId: 'c-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    })
    expect(autoComplete.execute).toHaveBeenCalledTimes(3)
    expect(autoComplete.execute).toHaveBeenCalledWith(
      expect.objectContaining({ itemKey: 'client_data' })
    )
    expect(autoComplete.execute).toHaveBeenCalledWith(
      expect.objectContaining({ itemKey: 'driver_license' })
    )
    expect(autoComplete.execute).toHaveBeenCalledWith(
      expect.objectContaining({ itemKey: 'vehicle_registration' })
    )
  })
})
