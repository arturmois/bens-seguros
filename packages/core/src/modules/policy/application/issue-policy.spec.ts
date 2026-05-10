import { describe, expect, it, vi } from 'vitest'
import type { OnPolicyIssued } from '../../commission/application/on-policy-issued.js'
import type {
  ContactData,
  ContactRepository,
} from '../../contact/domain/contact-repository.js'
import {
  ContactNotPromotedError,
  ProposalNotFoundError,
} from '../../proposal/domain/proposal-errors.js'
import type { ProposalRepository } from '../../proposal/domain/proposal-repository.js'
import { Proposal } from '../../proposal/domain/proposal.js'
import {
  PolicyMissingInsurerError,
  PolicyNotIssuableError,
} from '../domain/policy-errors.js'
import type {
  PolicyData,
  PolicyRepository,
} from '../domain/policy-repository.js'
import { IssuePolicy } from './issue-policy.js'

function makePolicyData(overrides: Partial<PolicyData> = {}): PolicyData {
  return {
    id: 'pol-1',
    organizationId: 'org-1',
    proposalId: 'prop-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    insurerId: null,
    policyNumber: 'POL-2024-001',
    status: 'ACTIVE',
    branch: 'AUTO',
    premiumValueInCents: 150000,
    coverageDetails: null,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-01-01'),
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeContactData(overrides: Partial<ContactData> = {}): ContactData {
  return {
    id: 'contact-1',
    organizationId: 'org-1',
    name: 'João Silva',
    phone: '11999999999',
    email: 'joao@test.com',
    source: 'MANUAL',
    salespersonId: 'u-1',
    clientId: 'c-1',
    tags: [],
    socialMedia: null,
    notes: null,
    consentLgpd: true,
    birthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

function createProposalAtStage(
  stage:
    | 'CAPTURE'
    | 'QUOTE'
    | 'PROTOCOL'
    | 'INSPECTION'
    | 'PAYMENT'
    | 'POLICY_ISSUED',
  insurerId?: string
): Proposal {
  const proposal = Proposal.create({
    organizationId: 'org-1',
    contactId: 'contact-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'NEW_INSURANCE',
    premiumValueInCents: 150000,
    commissionPercentageInCents: 1500,
    insurerId,
  })
  const stageOrder = [
    'CAPTURE',
    'QUOTE',
    'PROTOCOL',
    'INSPECTION',
    'PAYMENT',
    'POLICY_ISSUED',
  ] as const
  const targetIndex = stageOrder.indexOf(stage)
  for (let i = 0; i < targetIndex; i++) {
    if (i === 1) {
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
    }
    proposal.advance()
  }
  return proposal
}

function createMockPolicyRepo(
  policyData: PolicyData | null = null
): PolicyRepository {
  const created = policyData ?? makePolicyData()
  return {
    create: vi.fn().mockResolvedValue(created),
    findById: vi.fn().mockResolvedValue(policyData),
    findByPolicyNumber: vi.fn(),
    findMany: vi.fn(),
    cancel: vi.fn(),
  }
}

function createMockProposalRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    listForView: vi.fn(),
  }
}

function createMockContactRepo(
  contact: ContactData | null = makeContactData()
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

function createMockOnPolicyIssued(): OnPolicyIssued {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as OnPolicyIssued
}

describe('IssuePolicy', () => {
  it('issues policy from proposal at POLICY_ISSUED stage', async () => {
    const proposal = createProposalAtStage('POLICY_ISSUED', 'ins-1')
    const policyRepo = createMockPolicyRepo()
    const proposalRepo = createMockProposalRepo(proposal)
    const contactRepo = createMockContactRepo()
    const onPolicyIssued = createMockOnPolicyIssued()
    const useCase = new IssuePolicy(
      policyRepo,
      proposalRepo,
      contactRepo,
      onPolicyIssued
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      proposalId: proposal.id,
      policyNumber: 'POL-2024-001',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
    })
    expect(policyRepo.create).toHaveBeenCalledTimes(1)
    expect(policyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'c-1' })
    )
    expect(result.status).toBe('ACTIVE')
    expect(onPolicyIssued.execute).toHaveBeenCalledTimes(1)
  })
  it('throws ProposalNotFoundError when proposal does not exist', async () => {
    const policyRepo = createMockPolicyRepo()
    const proposalRepo = createMockProposalRepo(null)
    const contactRepo = createMockContactRepo()
    const onPolicyIssued = createMockOnPolicyIssued()
    const useCase = new IssuePolicy(
      policyRepo,
      proposalRepo,
      contactRepo,
      onPolicyIssued
    )
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        proposalId: 'missing-prop',
        policyNumber: 'POL-2024-001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
      })
    ).rejects.toThrow(ProposalNotFoundError)
    expect(policyRepo.create).not.toHaveBeenCalled()
  })
  it('uses provided insurerId when given', async () => {
    const proposal = createProposalAtStage('POLICY_ISSUED')
    const policyRepo = createMockPolicyRepo()
    const proposalRepo = createMockProposalRepo(proposal)
    const contactRepo = createMockContactRepo()
    const onPolicyIssued = createMockOnPolicyIssued()
    const useCase = new IssuePolicy(
      policyRepo,
      proposalRepo,
      contactRepo,
      onPolicyIssued
    )
    await useCase.execute({
      organizationId: 'org-1',
      proposalId: proposal.id,
      policyNumber: 'POL-2024-001',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
      insurerId: 'ins-override',
    })
    expect(policyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ insurerId: 'ins-override' })
    )
  })
  it('falls back to proposal insurerId when not provided', async () => {
    const proposal = createProposalAtStage('POLICY_ISSUED', 'ins-456')
    const policyRepo = createMockPolicyRepo()
    const proposalRepo = createMockProposalRepo(proposal)
    const contactRepo = createMockContactRepo()
    const onPolicyIssued = createMockOnPolicyIssued()
    const useCase = new IssuePolicy(
      policyRepo,
      proposalRepo,
      contactRepo,
      onPolicyIssued
    )
    await useCase.execute({
      organizationId: 'org-1',
      proposalId: proposal.id,
      policyNumber: 'POL-2024-001',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
    })
    expect(policyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ insurerId: proposal.insurerId })
    )
  })
  it('throws PolicyMissingInsurerError when neither dto nor proposal has insurerId', async () => {
    const proposal = createProposalAtStage('POLICY_ISSUED')
    const policyRepo = createMockPolicyRepo()
    const proposalRepo = createMockProposalRepo(proposal)
    const contactRepo = createMockContactRepo()
    const onPolicyIssued = createMockOnPolicyIssued()
    const useCase = new IssuePolicy(
      policyRepo,
      proposalRepo,
      contactRepo,
      onPolicyIssued
    )
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        policyNumber: 'POL-2024-001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
        // no insurerId provided
      })
    ).rejects.toThrow(PolicyMissingInsurerError)
    expect(policyRepo.create).not.toHaveBeenCalled()
  })
  it('throws PolicyNotIssuableError when proposal is not at POLICY_ISSUED stage', async () => {
    const proposal = createProposalAtStage('CAPTURE')
    const policyRepo = createMockPolicyRepo()
    const proposalRepo = createMockProposalRepo(proposal)
    const contactRepo = createMockContactRepo()
    const onPolicyIssued = createMockOnPolicyIssued()
    const useCase = new IssuePolicy(
      policyRepo,
      proposalRepo,
      contactRepo,
      onPolicyIssued
    )
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        policyNumber: 'POL-2024-001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
      })
    ).rejects.toThrow(PolicyNotIssuableError)
    expect(policyRepo.create).not.toHaveBeenCalled()
  })
  it('throws ContactNotPromotedError when contact has no clientId', async () => {
    const proposal = createProposalAtStage('POLICY_ISSUED', 'ins-1')
    const policyRepo = createMockPolicyRepo()
    const proposalRepo = createMockProposalRepo(proposal)
    const contactRepo = createMockContactRepo(
      makeContactData({ clientId: null })
    )
    const onPolicyIssued = createMockOnPolicyIssued()
    const useCase = new IssuePolicy(
      policyRepo,
      proposalRepo,
      contactRepo,
      onPolicyIssued
    )
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        proposalId: proposal.id,
        policyNumber: 'POL-2024-001',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
      })
    ).rejects.toThrow(ContactNotPromotedError)
    expect(policyRepo.create).not.toHaveBeenCalled()
  })
})
