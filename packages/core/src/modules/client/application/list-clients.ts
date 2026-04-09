import { inject, injectable } from 'tsyringe'
import type {
  ClientData,
  ClientFilters,
  ClientRepository,
  ClientSortField,
  CursorPage,
  Page,
} from '../domain/client-repository.js'

@injectable()
export class ListClients {
  constructor(
    @inject('ClientRepository') private readonly clientRepo: ClientRepository
  ) {}

  async execute(
    filters: ClientFilters,
    page: CursorPage<ClientSortField>
  ): Promise<Page<ClientData>> {
    return this.clientRepo.findMany(filters, page)
  }
}
