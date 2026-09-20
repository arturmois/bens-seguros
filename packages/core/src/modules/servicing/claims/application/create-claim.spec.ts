import { describe, expect, it, vi } from 'vitest'
import type {
  MemberContact,
  MemberRepository,
} from '../../workspace/members/domain/member-repository.js'
import type { NotificationDispatcher } from '../../notification/domain/notification-dispatcher.js'
import type {
  ClaimData,
  ClaimRepository,
  CreateClaimInput,
} from '../domain/claim-repository.js'
import { CreateClaim } from './create-claim.js'

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
    description: 'Vehicle collision on highway',
    estimatedValueInCents: null,
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

function createMockClaimRepo(
  claimData: ClaimData | null = null
): ClaimRepository {
  const created = claimData ?? makeClaimData()
  return {
    create: vi.fn().mockResolvedValue(created),
    findById: vi.fn().mockResolvedValue(claimData),
    findMany: vi.fn(),
    updateStatus: vi.fn(),
    softDelete: vi.fn(),
  }
}

function createMockMemberRepo(
  contacts: MemberContact[] = []
): MemberRepository {
  return {
    findById: vi.fn(),
    countByRole: vi.fn(),
    updateRole: vi.fn(),
    deactivate: vi.fn(),
    listOrganizationsForUser: vi.fn(),
    listActive: vi.fn(),
    existsActiveByEmail: vi.fn(),
    findContactsByRoles: vi.fn().mockResolvedValue(contacts),
    findContactByUserId: vi.fn(),
  }
}

function createMockDispatcher(): NotificationDispatcher {
  return { dispatch: vi.fn().mockResolvedValue(undefined) }
}

const baseContext = {
  creatorUserId: 'creator-user',
  frontendUrl: 'https://app.example.com',
}

describe('CreateClaim', () => {
  it('creates claim with auto-increment number', async () => {
    const claimData = makeClaimData({ claimNumber: 42 })
    const repo = createMockClaimRepo(claimData)
    const useCase = new CreateClaim(
      repo,
      createMockMemberRepo(),
      createMockDispatcher()
    )
    const dto: CreateClaimInput = {
      organizationId: 'org-1',
      policyId: 'pol-1',
      clientId: 'c-1',
      description: 'Vehicle collision on highway',
      incidentDate: new Date('2024-06-15'),
      incidentLocation: 'BR-101 km 42',
    }
    const result = await useCase.execute(dto, baseContext)
    expect(repo.create).toHaveBeenCalledWith(dto)
    expect(result.claimNumber).toBe(42)
    expect(result.status).toBe('REGISTERED')
  })
  it('skips dispatch when no managers found', async () => {
    const repo = createMockClaimRepo()
    const memberRepo = createMockMemberRepo([])
    const dispatcher = createMockDispatcher()
    const useCase = new CreateClaim(repo, memberRepo, dispatcher)
    await useCase.execute(
      {
        organizationId: 'org-1',
        policyId: 'pol-1',
        clientId: 'c-1',
        description: 'desc',
      },
      baseContext
    )
    expect(memberRepo.findContactsByRoles).toHaveBeenCalledWith(
      'org-1',
      ['OWNER', 'ADMIN', 'MANAGER'],
      'creator-user'
    )
    expect(dispatcher.dispatch).not.toHaveBeenCalled()
  })
  it('dispatches notifications to all managers with email', async () => {
    const repo = createMockClaimRepo(
      makeClaimData({ claimNumber: 7, priority: 'HIGH' })
    )
    const memberRepo = createMockMemberRepo([
      { userId: 'u1', email: 'admin@example.com', name: 'Admin User' },
      { userId: 'u2', email: null, name: 'No Email' },
    ])
    const dispatcher = createMockDispatcher()
    const useCase = new CreateClaim(repo, memberRepo, dispatcher)
    await useCase.execute(
      {
        organizationId: 'org-1',
        policyId: 'pol-1',
        clientId: 'c-1',
        description: 'desc',
      },
      baseContext
    )
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1)
    const items = vi.mocked(dispatcher.dispatch).mock.calls[0]?.[0] ?? []
    expect(items).toHaveLength(2)
    expect(items[0]?.notification.userId).toBe('u1')
    expect(items[0]?.notification.title).toBe('Novo sinistro aberto')
    expect(items[0]?.email?.to).toBe('admin@example.com')
    expect(items[1]?.email).toBeUndefined()
  })
})
