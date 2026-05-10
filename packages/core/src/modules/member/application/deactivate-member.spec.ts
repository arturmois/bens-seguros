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
import { DeactivateMember } from './deactivate-member.js'

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

describe('DeactivateMember', () => {
  it('deactivates member successfully', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(baseMember)
    const useCase = new DeactivateMember(repo)
    await useCase.execute({
      id: 'mem-1',
      organizationId: 'org-1',
      callerUserId: 'user-admin',
      callerRole: 'ADMIN',
    })
    expect(repo.deactivate).toHaveBeenCalledWith('mem-1', 'org-1')
  })
  it('throws MemberNotFoundError when member does not exist', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue(null)
    const useCase = new DeactivateMember(repo)
    await expect(
      useCase.execute({
        id: 'mem-999',
        organizationId: 'org-1',
        callerUserId: 'user-admin',
        callerRole: 'ADMIN',
      })
    ).rejects.toThrow(MemberNotFoundError)
  })
  it('throws SelfRemovalError when caller tries to deactivate self', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({
      ...baseMember,
      userId: 'user-self',
    })
    const useCase = new DeactivateMember(repo)
    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-self',
        callerRole: 'ADMIN',
      })
    ).rejects.toThrow(SelfRemovalError)
  })
  it('throws RoleHierarchyError when caller cannot manage target role', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({ ...baseMember, role: 'ADMIN' })
    const useCase = new DeactivateMember(repo)
    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-manager',
        callerRole: 'MANAGER',
      })
    ).rejects.toThrow(RoleHierarchyError)
  })
  it('throws LastOwnerError when deactivating the only OWNER', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findById).mockResolvedValue({ ...baseMember, role: 'OWNER' })
    vi.mocked(repo.countByRole).mockResolvedValue(1)
    const useCase = new DeactivateMember(repo)
    await expect(
      useCase.execute({
        id: 'mem-1',
        organizationId: 'org-1',
        callerUserId: 'user-other-owner',
        callerRole: 'OWNER',
      })
    ).rejects.toThrow(LastOwnerError)
  })
})
