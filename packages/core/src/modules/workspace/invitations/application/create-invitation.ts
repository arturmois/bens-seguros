import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../../shared/cache-service.js'
import { DuplicateInvitationError } from '../../members/domain/member-errors.js'
import type { MemberRepository } from '../../members/domain/member-repository.js'
import type { MemberRole } from '../../members/domain/member-roles.js'
import type { OrganizationRepository } from '../../organization/domain/organization-repository.js'
import type { InvitationEmailNotifier } from '../domain/invitation-email-notifier.js'
import {
  assertCanManageRole,
  invitationExpiresAt,
} from '../domain/invitation-policy.js'
import type {
  InvitationDetail,
  InvitationRepository,
} from '../domain/invitation-repository.js'

interface CreateInvitationInput {
  organizationId: string
  email: string
  role: MemberRole
  callerRole: MemberRole
  inviterUserId: string
  inviterName: string
}

@injectable()
export class CreateInvitation {
  constructor(
    @inject('InvitationRepository')
    private readonly invitationRepo: InvitationRepository,
    @inject('MemberRepository')
    private readonly memberRepo: MemberRepository,
    @inject('OrganizationRepository')
    private readonly orgRepo: OrganizationRepository,
    @inject('InvitationEmailNotifier')
    private readonly notifier: InvitationEmailNotifier,
    @inject('CacheService') private readonly cache: CacheService
  ) {}

  async execute(input: CreateInvitationInput): Promise<InvitationDetail> {
    assertCanManageRole(input.callerRole, input.role)
    await this.assertNoDuplicate(input.organizationId, input.email)
    const invitation = await this.invitationRepo.create({
      organizationId: input.organizationId,
      email: input.email,
      role: input.role,
      inviterId: input.inviterUserId,
      expiresAt: invitationExpiresAt(),
    })
    await this.notify(input, invitation.id)
    await this.cache.delete(`cache:${input.organizationId}:members`)
    return invitation
  }

  private async assertNoDuplicate(
    organizationId: string,
    email: string
  ): Promise<void> {
    const memberExists = await this.memberRepo.existsActiveByEmail(
      organizationId,
      email
    )
    if (memberExists) throw new DuplicateInvitationError(email)
    const inviteExists = await this.invitationRepo.existsActiveByEmail(
      organizationId,
      email
    )
    if (inviteExists) throw new DuplicateInvitationError(email)
  }

  private async notify(
    input: CreateInvitationInput,
    invitationId: string
  ): Promise<void> {
    const organization = await this.orgRepo.findById(input.organizationId)
    await this.notifier.notifyInvited({
      to: input.email,
      inviterName: input.inviterName,
      organizationName: organization?.name ?? 'Organização',
      role: input.role,
      invitationId,
    })
  }
}
