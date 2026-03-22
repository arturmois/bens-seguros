export interface ClientData {
  id: string
  organizationId: string
  name: string
  document: string
  type: 'LEAD' | 'CLIENT' | 'FORMER_CLIENT'
  email: string | null
  phone: string | null
  birthDate: Date | null
  profession: string | null
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER' | null
  address: ClientAddress | null
  tags: string[]
  consentLgpd: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ClientAddress {
  [key: string]: string | undefined
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zip?: string
}

export interface ClientFilters {
  organizationId: string
  type?: 'LEAD' | 'CLIENT' | 'FORMER_CLIENT'
  search?: string
}

export interface CursorPage {
  cursor?: string
  limit: number
}

export interface Page<TItem> {
  items: TItem[]
  total: number
  nextCursor: string | null
}

export interface CreateClientInput {
  organizationId: string
  name: string
  document: string
  type?: 'LEAD' | 'CLIENT' | 'FORMER_CLIENT'
  email?: string | null
  phone?: string | null
  birthDate?: Date | null
  profession?: string | null
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER' | null
  address?: ClientAddress | null
  tags?: string[]
  consentLgpd?: boolean
}

export interface UpdateClientInput {
  name?: string
  email?: string | null
  phone?: string | null
  birthDate?: Date | null
  profession?: string | null
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER' | null
  address?: ClientAddress | null
  tags?: string[]
  consentLgpd?: boolean
  type?: 'LEAD' | 'CLIENT' | 'FORMER_CLIENT'
}

export interface ClientRepository {
  create(data: CreateClientInput): Promise<ClientData>
  findById(id: string, organizationId: string): Promise<ClientData | null>
  findByDocument(
    document: string,
    organizationId: string
  ): Promise<ClientData | null>
  findMany(filters: ClientFilters, page: CursorPage): Promise<Page<ClientData>>
  update(
    id: string,
    organizationId: string,
    data: UpdateClientInput
  ): Promise<ClientData>
  softDelete(id: string, organizationId: string): Promise<void>
}
