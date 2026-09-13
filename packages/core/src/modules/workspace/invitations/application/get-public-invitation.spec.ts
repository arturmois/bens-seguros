import { describe, expect, it, vi } from 'vitest'
import { InvitationNotFoundError } from '../domain/invitation-errors.js'
import type {
  InvitationPublicView,
  InvitationRepository,
} from '../domain/invitation-repository.js'
import { GetPublicInvitation } from './get-public-invitation.js'

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

const sampleView: InvitationPublicView = {
  id: 'inv-1',
  email: 'invitee@user.com',
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date('2026-12-31'),
  organizationName: 'Corretora Exemplo',
  inviterName: 'Carlos Administrador',
  hasAccount: false,
}

describe('GetPublicInvitation.execute', () => {
  it('returns the public view when the invitation exists', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findByIdPublic).mockResolvedValue(sampleView)
    const useCase = new GetPublicInvitation(repo)
    const result = await useCase.execute('inv-1')
    expect(result).toBe(sampleView)
    expect(vi.mocked(repo.findByIdPublic)).toHaveBeenCalledWith('inv-1')
  })
  it('throws InvitationNotFoundError when not found', async () => {
    const repo = createMockRepo()
    vi.mocked(repo.findByIdPublic).mockResolvedValue(null)
    const useCase = new GetPublicInvitation(repo)
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      InvitationNotFoundError
    )
  })
})
