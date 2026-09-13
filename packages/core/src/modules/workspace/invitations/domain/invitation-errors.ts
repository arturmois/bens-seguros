export class InvitationNotFoundError extends Error {
  readonly code = 'INVITATION_NOT_FOUND' as const
  constructor(id: string) {
    super(`Invitation ${id} not found`)
    this.name = 'InvitationNotFoundError'
  }
}

export class InvitationExpiredError extends Error {
  readonly code = 'INVITATION_EXPIRED' as const
  constructor(id: string) {
    super(`Invitation ${id} has expired`)
    this.name = 'InvitationExpiredError'
  }
}

export class InvitationAlreadyAcceptedError extends Error {
  readonly code = 'INVITATION_ALREADY_ACCEPTED' as const
  constructor(id: string) {
    super(`Invitation ${id} has already been accepted`)
    this.name = 'InvitationAlreadyAcceptedError'
  }
}

export class AlreadyMemberError extends Error {
  readonly code = 'ALREADY_MEMBER' as const
  constructor(userId: string, organizationId: string) {
    super(
      `User ${userId} is already a member of organization ${organizationId}`
    )
    this.name = 'AlreadyMemberError'
  }
}
