import type { ContactSource } from './contact.js'

export type ContactStage =
  | 'LEAD'
  | 'CLIENT_NEW'
  | 'CLIENT_ACTIVE'
  | 'CLIENT_INACTIVE'

export interface ContactData {
  id: string
  organizationId: string
  name: string
  phone: string | null
  email: string | null
  source: ContactSource
  salespersonId: string
  clientId: string | null
  tags: string[]
  socialMedia: Record<string, unknown> | null
  notes: string | null
  consentLgpd: boolean
  birthDate: Date | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface ContactWithStage extends ContactData {
  stage: ContactStage
  activePolicyCount: number
}

export interface ContactFilters {
  organizationId: string
  stage?: ContactStage
  salespersonId?: string
  source?: ContactSource
  stageIn?: readonly ContactStage[]
  sourceIn?: readonly ContactSource[]
  salespersonIdIn?: readonly string[]
  consentLgpd?: boolean
  createdFrom?: Date
  createdTo?: Date
  search?: string
  clientId?: string
}

export type ContactSortField = 'createdAt' | 'updatedAt' | 'name'

export interface CursorPage<TSort> {
  cursor?: string
  limit: number
  sortBy?: TSort
  sortOrder?: 'asc' | 'desc'
}

export interface Page<TItem> {
  items: TItem[]
  total?: number
  nextCursor: string | null
}

export interface CreateContactPersistence {
  id: string
  organizationId: string
  name: string
  phone: string | null
  email: string | null
  source: ContactSource
  salespersonId: string
  clientId: string | null
  tags: string[]
  socialMedia: Record<string, unknown> | null
  notes: string | null
  consentLgpd: boolean
  birthDate: Date | null
}

export interface UpdateContactPersistence {
  name?: string
  phone?: string | null
  email?: string | null
  salespersonId?: string
  clientId?: string | null
  tags?: string[]
  socialMedia?: Record<string, unknown> | null
  notes?: string | null
  birthDate?: Date | null
}

export interface ContactRepository {
  save(data: CreateContactPersistence): Promise<ContactData>
  findById(id: string, organizationId: string): Promise<ContactData | null>
  findByPhone(
    phone: string,
    organizationId: string
  ): Promise<ContactData | null>
  findByIdWithStage(
    id: string,
    organizationId: string
  ): Promise<ContactWithStage | null>
  findMany(
    filters: ContactFilters,
    page: CursorPage<ContactSortField>
  ): Promise<Page<ContactWithStage>>
  update(
    id: string,
    organizationId: string,
    data: UpdateContactPersistence
  ): Promise<ContactData>
  softDelete(id: string, organizationId: string): Promise<void>
}
