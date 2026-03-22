import { injectable, inject } from 'tsyringe'
import type {
  ClientRepository,
  ClientData,
  ClientFilters,
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
    page: CursorPage
  ): Promise<Page<ClientData>> {
    return this.clientRepo.findMany(filters, page)
  }
}
