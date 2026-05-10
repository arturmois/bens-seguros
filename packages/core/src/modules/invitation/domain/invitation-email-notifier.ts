export interface InvitationEmailInput {
  to: string
  inviterName: string
  organizationName: string
  role: string
  invitationId: string
}

export interface InvitationEmailNotifier {
  notifyInvited(input: InvitationEmailInput): Promise<void>
}
