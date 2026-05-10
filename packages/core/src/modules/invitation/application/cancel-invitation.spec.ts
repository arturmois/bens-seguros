import { describe, expect, it, vi } from 'vitest'
import { InvitationNotFoundError } from '../domain/invitation-errors.js'
import type {
  InvitationDetail,
  InvitationRepository,
} from '../domain/invitation-repository.js'
import { CancelInvitation } from './cancel-invitation.js'

function createMockRepo(): InvitationRepository {
  return {
    findById: vi.fn(),
    isMember: vi.fn(),
    acceptAndCreateMember: vi.fn(),
    listPending: vi.fn(),
    cancelPending: vi.fn(),
    findByIdPublic: vi.fn(),
  }
}

const sampleInvitation: InvitationDetail = {
  id: 'inv-1',
  email: 'a@b.com',
  organizationId: 'org-1',
  role: 'COMMERCIAL',
  status: 'canceled',
  expiresAt: new Date('2026-12-31'),
  inviterId: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
}

describe('CancelInvitation.execute', () => {
  it('returns the canceled invitation when found and pending', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.cancelPending).mockResolvedValue(sampleInvitation)
    const useCase = new CancelInvitation(repo)
    const result = await useCase.execute('inv-1', 'org-1')
    expect(result).toBe(sampleInvitation)
    expect(vi.mocked(repo.cancelPending)).toHaveBeenCalledWith('inv-1', 'org-1')
  })
  it('throws InvitationNotFoundError when no pending invitation matches', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.cancelPending).mockResolvedValue(null)
    const useCase = new CancelInvitation(repo)
    await expect(useCase.execute('missing', 'org-1')).rejects.toBeInstanceOf(
      InvitationNotFoundError
    )
  })
})
