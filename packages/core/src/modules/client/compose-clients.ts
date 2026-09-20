import { CreateClient } from './application/create-client.js'
import { DeleteClient } from './application/delete-client.js'
import { ExportClientsCsv } from './application/export-clients-csv.js'
import { GetClient } from './application/get-client.js'
import { LgpdDeleteClient } from './application/lgpd-delete-client.js'
import { ListClients } from './application/list-clients.js'
import { ParseClientImport } from './application/parse-client-import.js'
import { UpdateClient } from './application/update-client.js'
import type { ClientRepository } from './domain/client-repository.js'

export interface ClientsApi {
  createClient: CreateClient
  listClients: ListClients
  getClient: GetClient
  updateClient: UpdateClient
  deleteClient: DeleteClient
  lgpdDeleteClient: LgpdDeleteClient
  exportClientsCsv: ExportClientsCsv
  parseClientImport: ParseClientImport
}

export function composeClients(repo: ClientRepository): ClientsApi {
  return {
    createClient: new CreateClient(repo),
    listClients: new ListClients(repo),
    getClient: new GetClient(repo),
    updateClient: new UpdateClient(repo),
    deleteClient: new DeleteClient(repo),
    lgpdDeleteClient: new LgpdDeleteClient(repo),
    exportClientsCsv: new ExportClientsCsv(repo),
    parseClientImport: new ParseClientImport(repo),
  }
}
