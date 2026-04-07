export interface InvitationRecord {
  readonly id: string
  readonly email: string
  readonly organizationId: string
  readonly role: string
  readonly status: string
  readonly expiresAt: Date
}

export interface AcceptInvitationResult {
  readonly organizationId: string
  readonly role: string
}

export interface InvitationRepository {
  findById(id: string): Promise<InvitationRecord | null>
  isMember(organizationId: string, userId: string): Promise<boolean>
  acceptAndCreateMember(
    invitationId: string,
    userId: string,
    organizationId: string,
    role: string
  ): Promise<void>
}
