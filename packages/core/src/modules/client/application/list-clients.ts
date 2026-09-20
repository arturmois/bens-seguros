import type {
  ClientRepository,
  ClientWithMetrics,
  PersonType,
} from '../domain/client-repository.js'

export interface ListClientsInput {
  organizationId: string
  hasActivePolicy?: boolean
  personTypeIn?: readonly PersonType[]
  search?: string
  cursor?: string
  limit: number
  sortBy?: 'createdAt' | 'legalName'
  sortOrder?: 'asc' | 'desc'
}

export class ListClients {
  constructor(private readonly clientRepo: ClientRepository) {}

  async execute(
    input: ListClientsInput
  ): Promise<{ items: ClientWithMetrics[]; nextCursor: string | null }> {
    return this.clientRepo.findMany(
      {
        organizationId: input.organizationId,
        hasActivePolicy: input.hasActivePolicy,
        personTypeIn: input.personTypeIn,
        search: input.search,
      },
      {
        cursor: input.cursor,
        limit: input.limit,
        sortBy: input.sortBy ?? 'createdAt',
        sortOrder: input.sortOrder ?? 'desc',
      }
    )
  }
}
