import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResolveMembership, type MembershipDb } from './resolve-membership.js'

const findUnique = vi.fn()
const db = { member: { findUnique } } as unknown as MembershipDb
const useCase = new ResolveMembership(db)

describe('ResolveMembership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('looks up the member by the organizationId + userId compound key', async () => {
    findUnique.mockResolvedValue(null)
    await useCase.execute({ userId: 'user-1', organizationId: 'org-1' })
    expect(findUnique).toHaveBeenCalledTimes(1)
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        organizationId_userId: { organizationId: 'org-1', userId: 'user-1' },
      },
    })
  })

  it('returns only role and active from the member row', async () => {
    findUnique.mockResolvedValue({
      id: 'mem-1',
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'ADMIN',
      active: false,
    })
    const result = await useCase.execute({
      userId: 'user-1',
      organizationId: 'org-1',
    })
    expect(result).toEqual({ role: 'ADMIN', active: false })
  })

  it('returns null when the user is not a member', async () => {
    findUnique.mockResolvedValue(null)
    const result = await useCase.execute({
      userId: 'user-1',
      organizationId: 'org-1',
    })
    expect(result).toBeNull()
  })
})
