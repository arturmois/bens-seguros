export interface SessionRef {
  readonly userId: string
  readonly email: string
}

export interface InvitationData {
  readonly id: string
  readonly email: string
  readonly role: string
  readonly organizationName: string
  readonly inviterName: string
  readonly hasAccount: boolean
  readonly currentSession: SessionRef | null
}

export type InvitationErrorVariant =
  | 'expired'
  | 'already_accepted'
  | 'not_found'

export type PageState =
  | { kind: 'loading' }
  | { kind: 'register'; invitation: InvitationData }
  | { kind: 'login'; invitation: InvitationData }
  | { kind: 'accept-as-current'; invitation: InvitationData }
  | { kind: 'wrong-account'; invitation: InvitationData }
  | { kind: 'error'; variant: InvitationErrorVariant }

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  COMMERCIAL: 'Comercial',
  VIEWER: 'Visualizador',
}
