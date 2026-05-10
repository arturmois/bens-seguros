import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../../../shared/cache-service.js'
import {
  DuplicateInvitationError,
  RoleHierarchyError,
} from '../../member/domain/member-errors.js'
import type { MemberRepository } from '../../member/domain/member-repository.js'
import type { OrganizationRepository } from '../../organization/domain/organization-repository.js'
import type { InvitationEmailNotifier } from '../domain/invitation-email-notifier.js'
import type { InvitationRepository } from '../domain/invitation-repository.js'
import { CreateInvitation } from './create-invitation.js'

function makeMocks() {
  const invitationRepo: InvitationRepository = {
    findById: vi.fn(),
    isMember: vi.fn(),
    acceptAndCreateMember: vi.fn(),
    listPending: vi.fn(),
    cancelPending: vi.fn(),
    findByIdPublic: vi.fn(),
    existsActiveByEmail: vi.fn().mockResolvedValue(false),
    create: vi.fn(),
  }
  const memberRepo: MemberRepository = {
    findById: vi.fn(),
    countByRole: vi.fn(),
    updateRole: vi.fn(),
    deactivate: vi.fn(),
    listOrganizationsForUser: vi.fn(),
    listActive: vi.fn(),
    existsActiveByEmail: vi.fn().mockResolvedValue(false),
  }
  const orgRepo: OrganizationRepository = {
    findById: vi.fn().mockResolvedValue({
      id: 'org-1',
      name: 'Corretora Exemplo',
      slug: 'corretora',
      logo: null,
      createdAt: new Date(),
    }),
    update: vi.fn(),
    updateLogo: vi.fn(),
    slugTakenByAnother: vi.fn(),
    getCurrentLogo: vi.fn(),
  }
  const notifier: InvitationEmailNotifier = {
    notifyInvited: vi.fn().mockResolvedValue(undefined),
  }
  const cache: CacheService = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  }
  return { invitationRepo, memberRepo, orgRepo, notifier, cache }
}

const sampleInvitation = {
  id: 'inv-1',
  email: 'newmember@user.com',
  organizationId: 'org-1',
  role: 'COMMERCIAL',
  status: 'pending',
  expiresAt: new Date('2026-12-31'),
  inviterId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('CreateInvitation.execute', () => {
  it('throws RoleHierarchyError when caller role does not outrank target', async () => {
    const m = makeMocks()
    const useCase = new CreateInvitation(
      m.invitationRepo,
      m.memberRepo,
      m.orgRepo,
      m.notifier,
      m.cache
    )
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        email: 'a@b.com',
        role: 'ADMIN',
        callerRole: 'COMMERCIAL',
        inviterUserId: 'user-1',
        inviterName: 'Carlos',
      })
    ).rejects.toBeInstanceOf(RoleHierarchyError)
    expect(vi.mocked(m.invitationRepo.create)).not.toHaveBeenCalled()
  })
  it('throws DuplicateInvitationError when an active member with that email exists', async () => {
    const m = makeMocks()
    vi.mocked(m.memberRepo.existsActiveByEmail).mockResolvedValue(true)
    const useCase = new CreateInvitation(
      m.invitationRepo,
      m.memberRepo,
      m.orgRepo,
      m.notifier,
      m.cache
    )
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        email: 'a@b.com',
        role: 'COMMERCIAL',
        callerRole: 'OWNER',
        inviterUserId: 'user-1',
        inviterName: 'Carlos',
      })
    ).rejects.toBeInstanceOf(DuplicateInvitationError)
    expect(vi.mocked(m.invitationRepo.create)).not.toHaveBeenCalled()
  })
  it('throws DuplicateInvitationError when an active pending invitation exists', async () => {
    const m = makeMocks()
    vi.mocked(m.invitationRepo.existsActiveByEmail).mockResolvedValue(true)
    const useCase = new CreateInvitation(
      m.invitationRepo,
      m.memberRepo,
      m.orgRepo,
      m.notifier,
      m.cache
    )
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        email: 'a@b.com',
        role: 'COMMERCIAL',
        callerRole: 'OWNER',
        inviterUserId: 'user-1',
        inviterName: 'Carlos',
      })
    ).rejects.toBeInstanceOf(DuplicateInvitationError)
  })
  it('persists, notifies via email, invalidates cache, and returns the invitation', async () => {
    const m = makeMocks()
    vi.mocked(m.invitationRepo.create).mockResolvedValue(sampleInvitation)
    const useCase = new CreateInvitation(
      m.invitationRepo,
      m.memberRepo,
      m.orgRepo,
      m.notifier,
      m.cache
    )
    const result = await useCase.execute({
      organizationId: 'org-1',
      email: 'newmember@user.com',
      role: 'COMMERCIAL',
      callerRole: 'OWNER',
      inviterUserId: 'user-1',
      inviterName: 'Carlos',
    })
    expect(result).toBe(sampleInvitation)
    expect(vi.mocked(m.invitationRepo.create)).toHaveBeenCalledWith({
      organizationId: 'org-1',
      email: 'newmember@user.com',
      role: 'COMMERCIAL',
      inviterId: 'user-1',
      expiresAt: expect.any(Date),
    })
    expect(vi.mocked(m.notifier.notifyInvited)).toHaveBeenCalledWith({
      to: 'newmember@user.com',
      inviterName: 'Carlos',
      organizationName: 'Corretora Exemplo',
      role: 'COMMERCIAL',
      invitationId: 'inv-1',
    })
    expect(vi.mocked(m.cache.delete)).toHaveBeenCalledWith(
      'cache:org-1:members'
    )
  })
  it('falls back to "Organização" when org cannot be found for the email', async () => {
    const m = makeMocks()
    vi.mocked(m.orgRepo.findById).mockResolvedValue(null)
    vi.mocked(m.invitationRepo.create).mockResolvedValue(sampleInvitation)
    const useCase = new CreateInvitation(
      m.invitationRepo,
      m.memberRepo,
      m.orgRepo,
      m.notifier,
      m.cache
    )
    await useCase.execute({
      organizationId: 'org-1',
      email: 'newmember@user.com',
      role: 'COMMERCIAL',
      callerRole: 'OWNER',
      inviterUserId: 'user-1',
      inviterName: 'Carlos',
    })
    expect(vi.mocked(m.notifier.notifyInvited)).toHaveBeenCalledWith(
      expect.objectContaining({ organizationName: 'Organização' })
    )
  })
})
