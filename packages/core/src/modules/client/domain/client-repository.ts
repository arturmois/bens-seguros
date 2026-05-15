import type { CursorPage, Page, SortOrder } from '../../../shared/pagination.js'
import type { ClientAddress } from './client-address.js'

export type { CursorPage, Page, SortOrder }

export type PersonType = 'INDIVIDUAL' | 'COMPANY'
export type MaritalStatus =
  | 'SINGLE'
  | 'MARRIED'
  | 'DIVORCED'
  | 'WIDOWED'
  | 'OTHER'

export interface ClientData {
  id: string
  organizationId: string
  legalName: string
  document: string
  documentHash: string
  personType: PersonType
  profession: string | null
  maritalStatus: MaritalStatus | null
  address: ClientAddress | null
  fiscalBirthDate: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface ClientWithMetrics extends ClientData {
  activePolicyCount: number
  totalPolicyCount: number
  contactCount: number
}

export interface ClientFilters {
  organizationId: string
  hasActivePolicy?: boolean
  personTypeIn?: readonly PersonType[]
  search?: string
}

export type ClientSortField = 'createdAt' | 'legalName'

export interface CreateClientPersistence {
  organizationId: string
  legalName: string
  document: string
  personType: PersonType
  profession: string | null
  maritalStatus: MaritalStatus | null
  address: ClientAddress | null
  fiscalBirthDate: Date | null
}

export interface UpdateClientPersistence {
  legalName?: string
  personType?: PersonType
  profession?: string | null
  maritalStatus?: MaritalStatus | null
  address?: ClientAddress | null
  fiscalBirthDate?: Date | null
}

export interface ClientRepository {
  save(data: CreateClientPersistence): Promise<ClientData>
  findById(id: string, organizationId: string): Promise<ClientData | null>
  findByIdWithMetrics(
    id: string,
    organizationId: string
  ): Promise<ClientWithMetrics | null>
  findByDocumentHash(
    documentHash: string,
    organizationId: string
  ): Promise<ClientData | null>
  findMany(
    filters: ClientFilters,
    page: CursorPage<ClientSortField>
  ): Promise<{ items: ClientWithMetrics[]; nextCursor: string | null }>
  update(
    id: string,
    organizationId: string,
    data: UpdateClientPersistence
  ): Promise<ClientData>
  softDelete(id: string, organizationId: string): Promise<void>
  lgpdAnonymize(id: string, organizationId: string): Promise<void>
}
