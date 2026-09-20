import type { StorageProvider } from '../../platform/storage/storage-provider.js'
import type { CacheService } from '../../shared/cache-service.js'
import { AcceptInvitation } from './invitations/application/accept-invitation.js'
import { CancelInvitation } from './invitations/application/cancel-invitation.js'
import { CreateInvitation } from './invitations/application/create-invitation.js'
import { ListPendingInvitations } from './invitations/application/list-pending-invitations.js'
import type { InvitationEmailNotifier } from './invitations/domain/invitation-email-notifier.js'
import type { InvitationRepository } from './invitations/domain/invitation-repository.js'
import { DeactivateMember } from './members/application/deactivate-member.js'
import { ListMembers } from './members/application/list-members.js'
import { ListUserTenants } from './members/application/list-user-tenants.js'
import { UpdateMemberRole } from './members/application/update-member-role.js'
import type { MemberRepository } from './members/domain/member-repository.js'
import { GetOrganization } from './organization/application/get-organization.js'
import { UpdateOrganization } from './organization/application/update-organization.js'
import { UploadOrganizationLogo } from './organization/application/upload-organization-logo.js'
import type { OrganizationRepository } from './organization/domain/organization-repository.js'

export interface ComposeWorkspaceInput {
  organizationRepo: OrganizationRepository
  memberRepo: MemberRepository
  invitationRepo: InvitationRepository
  cacheService: CacheService
  storageProvider: StorageProvider
  invitationEmailNotifier: InvitationEmailNotifier
}

export interface WorkspaceApi {
  getOrganization: GetOrganization
  updateOrganization: UpdateOrganization
  uploadOrganizationLogo: UploadOrganizationLogo
  updateMemberRole: UpdateMemberRole
  deactivateMember: DeactivateMember
  listUserTenants: ListUserTenants
  listMembers: ListMembers
  acceptInvitation: AcceptInvitation
  cancelInvitation: CancelInvitation
  listPendingInvitations: ListPendingInvitations
  createInvitation: CreateInvitation
}

export function composeWorkspace(input: ComposeWorkspaceInput): WorkspaceApi {
  const {
    organizationRepo,
    memberRepo,
    invitationRepo,
    cacheService,
    storageProvider,
    invitationEmailNotifier,
  } = input

  return {
    getOrganization: new GetOrganization(
      organizationRepo,
      cacheService,
      storageProvider
    ),
    updateOrganization: new UpdateOrganization(
      organizationRepo,
      cacheService,
      storageProvider
    ),
    uploadOrganizationLogo: new UploadOrganizationLogo(
      organizationRepo,
      cacheService,
      storageProvider
    ),
    updateMemberRole: new UpdateMemberRole(memberRepo, cacheService),
    deactivateMember: new DeactivateMember(memberRepo, cacheService),
    listUserTenants: new ListUserTenants(memberRepo),
    listMembers: new ListMembers(memberRepo, cacheService),
    acceptInvitation: new AcceptInvitation(invitationRepo, cacheService),
    cancelInvitation: new CancelInvitation(invitationRepo),
    listPendingInvitations: new ListPendingInvitations(invitationRepo),
    createInvitation: new CreateInvitation(
      invitationRepo,
      memberRepo,
      organizationRepo,
      invitationEmailNotifier,
      cacheService
    ),
  }
}
