export interface InvitationRecord {
  readonly id: string
  readonly email: string
  readonly organizationId: string
  readonly role: string
  readonly status: string
  readonly expiresAt: Date
}

export interface InvitationDetail extends InvitationRecord {
  readonly inviterId: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface InvitationListPage {
  readonly items: readonly InvitationDetail[]
  readonly total: number
  readonly nextCursor: string | null
}

export interface InvitationPublicView {
  readonly id: string
  readonly email: string
  readonly role: string
  readonly status: string
  readonly expiresAt: Date
  readonly organizationName: string
  readonly inviterName: string
  readonly hasAccount: boolean
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
  listPending(
    organizationId: string,
    options: { limit: number; cursor?: string }
  ): Promise<InvitationListPage>
  cancelPending(
    id: string,
    organizationId: string
  ): Promise<InvitationDetail | null>
  findByIdPublic(id: string): Promise<InvitationPublicView | null>
}
