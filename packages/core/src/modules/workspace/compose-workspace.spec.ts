import { describe, expect, it } from 'vitest'
import type { StorageProvider } from '../../platform/storage/storage-provider.js'
import type { CacheService } from '../../shared/cache-service.js'
import { composeWorkspace } from './compose-workspace.js'
import type { InvitationEmailNotifier } from './invitations/domain/invitation-email-notifier.js'
import type { InvitationRepository } from './invitations/domain/invitation-repository.js'
import type { MemberRepository } from './members/domain/member-repository.js'
import type { OrganizationRepository } from './organization/domain/organization-repository.js'

function fakeCollaborators() {
  return {
    organizationRepo: {} as OrganizationRepository,
    memberRepo: {} as MemberRepository,
    invitationRepo: {} as InvitationRepository,
    cacheService: {} as CacheService,
    storageProvider: {} as StorageProvider,
    invitationEmailNotifier: {} as InvitationEmailNotifier,
  }
}

describe('composeWorkspace', () => {
  it('composeWorkspace returns getOrganization listMembers createInvitation', () => {
    const api = composeWorkspace(fakeCollaborators())
    expect(api.getOrganization.execute).toEqual(expect.any(Function))
    expect(api.listMembers.execute).toEqual(expect.any(Function))
    expect(api.createInvitation.execute).toEqual(expect.any(Function))
  })
})
