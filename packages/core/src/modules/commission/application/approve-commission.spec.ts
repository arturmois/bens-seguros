import { describe, expect, it, vi } from 'vitest'
import type { MemberRepository } from '../../workspace/members/domain/member-repository.js'
import type { NotificationDispatcher } from '../../notification/domain/notification-dispatcher.js'
import {
  CommissionNotFoundError,
  InvalidCommissionTransitionError,
} from '../domain/commission-errors.js'
import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { ApproveCommissionAdmin } from './approve-commission-admin.js'
import { ApproveCommissionCommercial } from './approve-commission-commercial.js'

function createMockMemberRepo(): MemberRepository {
  return {
    findById: vi.fn(),
    countByRole: vi.fn(),
    updateRole: vi.fn(),
    deactivate: vi.fn(),
    listOrganizationsForUser: vi.fn(),
    listActive: vi.fn(),
    existsActiveByEmail: vi.fn(),
    findContactsByRoles: vi.fn(),
    findContactByUserId: vi.fn().mockResolvedValue(null),
    findOldestActive: vi.fn(),
  }
}

function createMockDispatcher(): NotificationDispatcher {
  return { dispatch: vi.fn().mockResolvedValue(undefined) }
}

function makeCommissionData(
  overrides: Partial<CommissionData> = {}
): CommissionData {
  return {
    id: 'comm-1',
    organizationId: 'org-1',
    policyId: 'pol-1',
    salespersonId: 'user-1',
    status: 'PENDING_COMMERCIAL',
    commissionValueInCents: 15000,
    premiumValueInCents: 100000,
    percentageInBasisPoints: 1500,
    splitPercentage: 10000,
    approvedBy: null,
    approvedAt: null,
    paidAt: null,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    isReversal: false,
    originalCommissionId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(data: CommissionData | null): CommissionRepository {
  return {
    save: vi.fn().mockResolvedValue(data),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
    findPendingCommercial: vi.fn(),
    update: vi.fn().mockImplementation(async (commission) => {
      const json = commission.toJSON()
      return {
        ...json,
        splitPercentage: json.splitPercentage,
      } satisfies CommissionData
    }),
    reverseAtomic: vi.fn(),
  }
}

describe('ApproveCommissionCommercial', () => {
  it('advances commission from PENDING_COMMERCIAL to PENDING_ADMIN', async () => {
    const data = makeCommissionData({ status: 'PENDING_COMMERCIAL' })
    const repo = createMockRepo(data)
    const useCase = new ApproveCommissionCommercial(repo)
    await useCase.execute('comm-1', 'org-1', 'approver-1')
    expect(repo.update).toHaveBeenCalledTimes(1)
    const savedCommission = vi.mocked(repo.update).mock.calls[0]?.[0]
    expect(savedCommission?.status).toBe('PENDING_ADMIN')
  })
  it('throws CommissionNotFoundError when commission does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new ApproveCommissionCommercial(repo)
    await expect(useCase.execute('missing', 'org-1', 'user-1')).rejects.toThrow(
      CommissionNotFoundError
    )
  })
  it('throws InvalidCommissionTransitionError when status is not PENDING_COMMERCIAL', async () => {
    const data = makeCommissionData({ status: 'APPROVED' })
    const repo = createMockRepo(data)
    const useCase = new ApproveCommissionCommercial(repo)
    await expect(useCase.execute('comm-1', 'org-1', 'user-1')).rejects.toThrow(
      InvalidCommissionTransitionError
    )
  })
})
describe('ApproveCommissionAdmin', () => {
  it('advances commission from PENDING_ADMIN to APPROVED with approver info', async () => {
    const data = makeCommissionData({ status: 'PENDING_ADMIN' })
    const repo = createMockRepo(data)
    const useCase = new ApproveCommissionAdmin(
      repo,
      createMockMemberRepo(),
      createMockDispatcher()
    )
    await useCase.execute('comm-1', 'org-1', 'admin-1')
    expect(repo.update).toHaveBeenCalledTimes(1)
    const savedCommission = vi.mocked(repo.update).mock.calls[0]?.[0]
    expect(savedCommission?.status).toBe('APPROVED')
    expect(savedCommission?.approvedBy).toBe('admin-1')
    expect(savedCommission?.approvedAt).toBeInstanceOf(Date)
  })
  it('throws CommissionNotFoundError when commission does not exist', async () => {
    const repo = createMockRepo(null)
    const useCase = new ApproveCommissionAdmin(
      repo,
      createMockMemberRepo(),
      createMockDispatcher()
    )
    await expect(useCase.execute('missing', 'org-1', 'user-1')).rejects.toThrow(
      CommissionNotFoundError
    )
  })
  it('throws InvalidCommissionTransitionError when status is not PENDING_ADMIN', async () => {
    const data = makeCommissionData({ status: 'PENDING_COMMERCIAL' })
    const repo = createMockRepo(data)
    const useCase = new ApproveCommissionAdmin(
      repo,
      createMockMemberRepo(),
      createMockDispatcher()
    )
    await expect(useCase.execute('comm-1', 'org-1', 'user-1')).rejects.toThrow(
      InvalidCommissionTransitionError
    )
  })
})
