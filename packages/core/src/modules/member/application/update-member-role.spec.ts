import { describe, expect, it, vi } from 'vitest'
import type {
  MemberRepository,
  MemberRecord,
} from '../domain/member-repository.js'
import {
  MemberNotFoundError,
  SelfRemovalError,
  RoleHierarchyError,
  LastOwnerError,
} from '../domain/member-errors.js'
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
  }
}

describe('UpdateMemberRole', () => {
  it('updates role successfully', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(baseMember)
    vi.mocked(repo.updateRole).mockResolvedValue({
      ...baseMember,
      role: 'MANAGER',
    })
    const useCase = new UpdateMemberRole(repo)

    const result = await useCase.execute({
      id: 'mem-1',
      organizationId: 'org-1',
      callerUserId: 'user-admin',
      callerRole: 'ADMIN',
      newRole: 'MANAGER',
    })

    expect(repo.updateRole).toHaveBeenCalledWith('mem-1', 'org-1', 'MANAGER')
    expect(result.role).toBe('MANAGER')
  })

  it('throws MemberNotFoundError when member does not exist', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(null)
    const useCase = new UpdateMemberRole(repo)

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
    const useCase = new UpdateMemberRole(repo)

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
    const useCase = new UpdateMemberRole(repo)

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
    const useCase = new UpdateMemberRole(repo)

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
    const useCase = new UpdateMemberRole(repo)

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
