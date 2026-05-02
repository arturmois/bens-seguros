import { inject, injectable } from 'tsyringe'
import type {
  ClientRepository,
  ClientWithMetrics,
} from '../domain/client-repository.js'

export interface ListClientsInput {
  organizationId: string
  hasActivePolicy?: boolean
  search?: string
  cursor?: string
  limit: number
  sortBy?: 'createdAt' | 'legalName'
  sortOrder?: 'asc' | 'desc'
}

@injectable()
export class ListClients {
  constructor(
    @inject('ClientRepository') private readonly clientRepo: ClientRepository
  ) {}

  async execute(
    input: ListClientsInput
  ): Promise<{ items: ClientWithMetrics[]; nextCursor: string | null }> {
    return this.clientRepo.findMany(
      {
        organizationId: input.organizationId,
        hasActivePolicy: input.hasActivePolicy,
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
