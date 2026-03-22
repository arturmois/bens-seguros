import type { CursorPage, Page } from '../../client/domain/client-repository.js'

export interface InsurerData {
  id: string
  organizationId: string
  name: string
  code: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface InsurerFilters {
  organizationId: string
  active?: boolean
  search?: string
}

export interface CreateInsurerInput {
  organizationId: string
  name: string
  code?: string
  active?: boolean
}

export interface InsurerRepository {
  create(data: CreateInsurerInput): Promise<InsurerData>
  findById(id: string, organizationId: string): Promise<InsurerData | null>
  findByName(name: string, organizationId: string): Promise<InsurerData | null>
  findMany(
    filters: InsurerFilters,
    page: CursorPage
  ): Promise<Page<InsurerData>>
}
