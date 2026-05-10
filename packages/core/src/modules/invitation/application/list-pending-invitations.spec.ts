import { describe, expect, it, vi } from 'vitest'
import type { InvitationRepository } from '../domain/invitation-repository.js'
import { ListPendingInvitations } from './list-pending-invitations.js'

function createMockRepo(): InvitationRepository {
  return {
    findById: vi.fn(),
    isMember: vi.fn(),
    acceptAndCreateMember: vi.fn(),
    listPending: vi.fn(),
    cancelPending: vi.fn(),
  }
}

describe('ListPendingInvitations.execute', () => {
  it('forwards organizationId, limit and cursor to the repository', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.listPending).mockResolvedValue({
      items: [],
      total: 0,
      nextCursor: null,
    })
    const useCase = new ListPendingInvitations(repo)
    await useCase.execute({
      organizationId: 'org-1',
      limit: 20,
      cursor: 'inv-100',
    })
    expect(vi.mocked(repo.listPending)).toHaveBeenCalledWith('org-1', {
      limit: 20,
      cursor: 'inv-100',
    })
  })
  it('returns the repository result unchanged', async () => {
    const repo = createMockRepo()
    const expected = {
      items: [
        {
          id: 'inv-1',
          email: 'a@b.com',
          organizationId: 'org-1',
          role: 'COMMERCIAL',
          status: 'pending',
          expiresAt: new Date('2026-12-31'),
          inviterId: 'user-1',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ],
      total: 1,
      nextCursor: null,
    }
    vi.mocked(repo.listPending).mockResolvedValue(expected)
    const useCase = new ListPendingInvitations(repo)
    const result = await useCase.execute({ organizationId: 'org-1', limit: 20 })
    expect(result).toBe(expected)
  })
})
