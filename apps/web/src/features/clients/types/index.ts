export type ClientType = 'LEAD' | 'CLIENT' | 'FORMER_CLIENT'

export type MaritalStatus =
  | 'SINGLE'
  | 'MARRIED'
  | 'DIVORCED'
  | 'WIDOWED'
  | 'OTHER'

export interface ClientData {
  readonly id: string
  readonly organizationId: string
  readonly name: string
  readonly document: string
  readonly type: ClientType
  readonly email: string | null
  readonly phone: string | null
  readonly birthDate: Date | null
  readonly profession: string | null
  readonly maritalStatus: MaritalStatus | null
  readonly address: Record<string, string> | null
  readonly tags: readonly string[]
  readonly consentLgpd: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export interface ClientListMeta {
  readonly total: number
  readonly nextCursor: string | null
}

export interface ClientFilters {
  readonly search?: string
  readonly type?: ClientType
  readonly cursor?: string
  readonly limit?: number
}
