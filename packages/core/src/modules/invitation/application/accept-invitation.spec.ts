import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../../../shared/cache-service.js'
import {
  AlreadyMemberError,
  InvitationAlreadyAcceptedError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '../domain/invitation-errors.js'
import type {
  InvitationRecord,
  InvitationRepository,
} from '../domain/invitation-repository.js'
import { AcceptInvitation } from './accept-invitation.js'

const validInvitation: InvitationRecord = {
  id: 'inv-1',
  email: 'new@user.com',
  organizationId: 'org-1',
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date(Date.now() + 86400000),
}

function createMockRepo(): InvitationRepository {
  return {
    findById: vi.fn(),
    isMember: vi.fn(),
    acceptAndCreateMember: vi.fn(),
    listPending: vi.fn(),
    cancelPending: vi.fn(),
    findByIdPublic: vi.fn(),
    existsActiveByEmail: vi.fn(),
    create: vi.fn(),
  }
}

function createMockCache(): CacheService {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('AcceptInvitation', () => {
  it('accepts invitation, creates member, and invalidates members cache', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(validInvitation)
    vi.mocked(repo.isMember).mockResolvedValue(false)
    const cache = createMockCache()
    const useCase = new AcceptInvitation(repo, cache)
    const result = await useCase.execute({
      invitationId: 'inv-1',
      userId: 'user-1',
    })
    expect(repo.findById).toHaveBeenCalledWith('inv-1')
    expect(repo.isMember).toHaveBeenCalledWith('org-1', 'user-1')
    expect(repo.acceptAndCreateMember).toHaveBeenCalledWith(
      'inv-1',
      'user-1',
      'org-1',
      'COMMERCIAL'
    )
    expect(result.organizationId).toBe('org-1')
    expect(result.role).toBe('COMMERCIAL')
    expect(vi.mocked(cache.delete)).toHaveBeenCalledWith('cache:org-1:members')
  })
  it('throws InvitationNotFoundError when invitation does not exist', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(null)
    const useCase = new AcceptInvitation(repo, createMockCache())
    await expect(
      useCase.execute({ invitationId: 'inv-999', userId: 'user-1' })
    ).rejects.toThrow(InvitationNotFoundError)
  })
  it('throws InvitationNotFoundError when invitation is canceled', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...validInvitation,
      status: 'canceled',
    })
    const useCase = new AcceptInvitation(repo, createMockCache())
    await expect(
      useCase.execute({ invitationId: 'inv-1', userId: 'user-1' })
    ).rejects.toThrow(InvitationNotFoundError)
  })
  it('throws InvitationAlreadyAcceptedError when already accepted', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...validInvitation,
      status: 'accepted',
    })
    const useCase = new AcceptInvitation(repo, createMockCache())
    await expect(
      useCase.execute({ invitationId: 'inv-1', userId: 'user-1' })
    ).rejects.toThrow(InvitationAlreadyAcceptedError)
  })
  it('throws InvitationExpiredError when invitation has expired', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...validInvitation,
      expiresAt: new Date(Date.now() - 86400000),
    })
    const useCase = new AcceptInvitation(repo, createMockCache())
    await expect(
      useCase.execute({ invitationId: 'inv-1', userId: 'user-1' })
    ).rejects.toThrow(InvitationExpiredError)
  })
  it('throws AlreadyMemberError when user is already a member', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(validInvitation)
    vi.mocked(repo.isMember).mockResolvedValue(true)
    const useCase = new AcceptInvitation(repo, createMockCache())
    await expect(
      useCase.execute({ invitationId: 'inv-1', userId: 'user-1' })
    ).rejects.toThrow(AlreadyMemberError)
  })
})
