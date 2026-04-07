import { inject, injectable } from 'tsyringe'
import {
  AlreadyMemberError,
  InvitationAlreadyAcceptedError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from '../domain/invitation-errors.js'
import type {
  AcceptInvitationResult,
  InvitationRepository,
} from '../domain/invitation-repository.js'

export interface AcceptInvitationInput {
  readonly invitationId: string
  readonly userId: string
}

@injectable()
export class AcceptInvitation {
  constructor(
    @inject('InvitationRepository')
    private readonly invitationRepo: InvitationRepository
  ) {}

  async execute(input: AcceptInvitationInput): Promise<AcceptInvitationResult> {
    const { invitationId, userId } = input

    const invitation = await this.invitationRepo.findById(invitationId)

    if (!invitation || invitation.status === 'canceled') {
      throw new InvitationNotFoundError(invitationId)
    }

    if (invitation.status === 'accepted') {
      throw new InvitationAlreadyAcceptedError(invitationId)
    }

    if (invitation.expiresAt < new Date()) {
      throw new InvitationExpiredError(invitationId)
    }

    const alreadyMember = await this.invitationRepo.isMember(
      invitation.organizationId,
      userId
    )
    if (alreadyMember) {
      throw new AlreadyMemberError(userId, invitation.organizationId)
    }

    await this.invitationRepo.acceptAndCreateMember(
      invitationId,
      userId,
      invitation.organizationId,
      invitation.role
    )

    return {
      organizationId: invitation.organizationId,
      role: invitation.role,
    }
  }
}
