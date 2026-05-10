import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../../../shared/cache-service.js'
import {
  LastOwnerError,
  MemberNotFoundError,
  RoleHierarchyError,
  SelfRemovalError,
} from '../domain/member-errors.js'
import type {
  MemberRecord,
  MemberRepository,
} from '../domain/member-repository.js'
import { UpdateMemberRole } from './update-member-role.js'

const baseMember: MemberRecord = {
  id: 'mem-1',
  userId: 'user-target',
  organizationId: 'org-1',
  role: 'COMMERCIAL',
  active: true,
}

function createMockRepo(): MemberRepository {
  return {
    findById: vi.fn(),
    countByRole: vi.fn(),
    updateRole: vi.fn(),
    deactivate: vi.fn(),
    listOrganizationsForUser: vi.fn(),
    listActive: vi.fn(),
    existsActiveByEmail: vi.fn(),
  }
}

function createMockCache(): CacheService {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('UpdateMemberRole', () => {
  it('updates role and invalidates cache successfully', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(baseMember)
    vi.mocked(repo.updateRole).mockResolvedValue({
      ...baseMember,
      role: 'MANAGER',
    })
    const cache = createMockCache()
    const useCase = new UpdateMemberRole(repo, cache)
    const result = await useCase.execute({
      id: 'mem-1',
      organizationId: 'org-1',
      callerUserId: 'user-admin',
      callerRole: 'ADMIN',
      newRole: 'MANAGER',
    })
    expect(repo.updateRole).toHaveBeenCalledWith('mem-1', 'org-1', 'MANAGER')
    expect(result.role).toBe('MANAGER')
    expect(vi.mocked(cache.delete)).toHaveBeenCalledWith('cache:org-1:members')
  })
  it('throws MemberNotFoundError when member does not exist', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(null)
    const useCase = new UpdateMemberRole(repo, createMockCache())
    await expect(
      useCase.execute({
        id: 'mem-999',
        organizationId: 'org-1',
        callerUserId: 'user-admin',
        callerRole: 'ADMIN',
        newRole: 'MANAGER',
      })
    ).rejects.toThrow(MemberNotFoundError)
  })
  it('throws SelfRemovalError when caller tries to change own role', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...baseMember,
      userId: 'user-self',
    })
    const useCase = new UpdateMemberRole(repo, createMockCache())
    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-self',
        callerRole: 'ADMIN',
        newRole: 'VIEWER',
      })
    ).rejects.toThrow(SelfRemovalError)
  })
  it('throws RoleHierarchyError when caller role is not higher than target', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({ ...baseMember, role: 'ADMIN' })
    const useCase = new UpdateMemberRole(repo, createMockCache())
    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-manager',
        callerRole: 'MANAGER',
        newRole: 'VIEWER',
      })
    ).rejects.toThrow(RoleHierarchyError)
  })
  it('throws LastOwnerError when demoting the only OWNER', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({ ...baseMember, role: 'OWNER' })
    vi.mocked(repo.countByRole).mockResolvedValue(1)
    const useCase = new UpdateMemberRole(repo, createMockCache())
    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-other-owner',
        callerRole: 'OWNER',
        newRole: 'ADMIN',
      })
    ).rejects.toThrow(LastOwnerError)
  })
  it('calls countByRole when target member is OWNER', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({ ...baseMember, role: 'OWNER' })
    vi.mocked(repo.countByRole).mockResolvedValue(2)
    vi.mocked(repo.updateRole).mockResolvedValue({
      ...baseMember,
      role: 'ADMIN',
    })
    const useCase = new UpdateMemberRole(repo, createMockCache())
    await useCase.execute({
      id: 'mem-1',
      organizationId: 'org-1',
      callerUserId: 'user-other-owner',
      callerRole: 'OWNER',
      newRole: 'ADMIN',
    })
    expect(repo.countByRole).toHaveBeenCalledWith('org-1', 'OWNER')
  })
})
