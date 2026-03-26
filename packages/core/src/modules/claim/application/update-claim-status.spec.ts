// packages/core/src/modules/claim/application/update-claim-status.spec.ts
import { describe, expect, it, vi } from 'vitest'
import type { ClaimData, ClaimRepository } from '../domain/claim-repository.js'
import {
  ClaimNotFoundError,
  InvalidClaimStatusTransitionError,
} from '../domain/claim-errors.js'
import { UpdateClaimStatus } from './update-claim-status.js'

function makeClaimData(overrides: Partial<ClaimData> = {}): ClaimData {
  return {
    id: 'claim-1',
    organizationId: 'org-1',
    claimNumber: 1,
    policyId: 'pol-1',
    clientId: 'c-1',
    insurerId: null,
    assignedToId: null,
    status: 'REGISTERED',
    priority: 'NORMAL',
    description: 'Vehicle collision',
    incidentDate: new Date('2024-06-15'),
    incidentLocation: 'BR-101 km 42',
    reportedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: ClaimData | null): ClaimRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
    updateStatus: vi.fn().mockImplementation(async (_id, _orgId, input) => ({
      ...makeClaimData(),
      ...input,
    })),
    softDelete: vi.fn(),
  }
}

describe('UpdateClaimStatus', () => {
  // Valid transitions
  it('transitions REGISTERED to IN_ANALYSIS', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'REGISTERED' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'IN_ANALYSIS')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'IN_ANALYSIS',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions IN_ANALYSIS to AWAITING_DOCUMENT', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'IN_ANALYSIS' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'AWAITING_DOCUMENT')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'AWAITING_DOCUMENT',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions IN_ANALYSIS to PENDING_INSPECTION', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'IN_ANALYSIS' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'PENDING_INSPECTION')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'PENDING_INSPECTION',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions IN_ANALYSIS to APPROVED and sets resolvedAt', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'IN_ANALYSIS' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'APPROVED')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'APPROVED',
      resolvedAt: expect.any(Date),
      closedAt: undefined,
    })
  })

  it('transitions IN_ANALYSIS to REJECTED and sets resolvedAt', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'IN_ANALYSIS' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'REJECTED')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'REJECTED',
      resolvedAt: expect.any(Date),
      closedAt: undefined,
    })
  })

  it('transitions AWAITING_DOCUMENT back to IN_ANALYSIS', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'AWAITING_DOCUMENT' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'IN_ANALYSIS')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'IN_ANALYSIS',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions PENDING_INSPECTION to APPROVED and sets resolvedAt', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'PENDING_INSPECTION' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'APPROVED')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'APPROVED',
      resolvedAt: expect.any(Date),
      closedAt: undefined,
    })
  })

  it('transitions APPROVED to PAID', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'APPROVED' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'PAID')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'PAID',
      resolvedAt: undefined,
      closedAt: undefined,
    })
  })

  it('transitions PAID to COMPLETED and sets closedAt', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'PAID' }))
    const useCase = new UpdateClaimStatus(repo)

    await useCase.execute('claim-1', 'org-1', 'COMPLETED')

    expect(repo.updateStatus).toHaveBeenCalledWith('claim-1', 'org-1', {
      status: 'COMPLETED',
      resolvedAt: undefined,
      closedAt: expect.any(Date),
    })
  })

  // Invalid transitions
  it('rejects REGISTERED to APPROVED', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'REGISTERED' }))
    const useCase = new UpdateClaimStatus(repo)

    await expect(
      useCase.execute('claim-1', 'org-1', 'APPROVED')
    ).rejects.toThrow(InvalidClaimStatusTransitionError)
  })

  it('rejects COMPLETED to any status', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'COMPLETED' }))
    const useCase = new UpdateClaimStatus(repo)

    await expect(
      useCase.execute('claim-1', 'org-1', 'IN_ANALYSIS')
    ).rejects.toThrow(InvalidClaimStatusTransitionError)
  })

  it('rejects REJECTED to any status', async () => {
    const repo = createMockRepo(makeClaimData({ status: 'REJECTED' }))
    const useCase = new UpdateClaimStatus(repo)

    await expect(
      useCase.execute('claim-1', 'org-1', 'IN_ANALYSIS')
    ).rejects.toThrow(InvalidClaimStatusTransitionError)
  })

  // Not found
  it('throws ClaimNotFoundError when claim does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new UpdateClaimStatus(repo)

    await expect(
      useCase.execute('missing', 'org-1', 'IN_ANALYSIS')
    ).rejects.toThrow(ClaimNotFoundError)
    expect(repo.updateStatus).not.toHaveBeenCalled()
  })
})
