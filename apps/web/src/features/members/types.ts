export interface MemberData {
  readonly id: string
  readonly userId: string
  readonly name: string
  readonly email: string
  readonly role: string
  readonly active: boolean
  readonly createdAt: string
}

export interface InvitationData {
  readonly id: string
  readonly email: string
  readonly role: string
  readonly status: string
  readonly expiresAt: string
  readonly invitedBy: string
  readonly createdAt: string
}
