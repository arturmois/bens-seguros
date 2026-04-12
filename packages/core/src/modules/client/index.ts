// Domain
export {
  ClientAlreadyExistsError,
  ClientErrors,
  ClientNotFoundError,
} from './domain/client-errors.js'
export type {
  ClientAddress,
  ClientData,
  ClientFilters,
  ClientRepository,
  ClientSortField,
  CreateClientInput,
  CursorPage,
  Page,
  SortOrder,
  UpdateClientInput,
} from './domain/client-repository.js'

// Application
export { ClientPresenter } from './application/client-presenter.js'
export type {
  ClientDetail,
  ClientListItem,
  PresenterContext,
} from './application/client-presenter.js'
export { CreateClient } from './application/create-client.js'
export { DeleteClient } from './application/delete-client.js'
export { LgpdDeleteClient } from './application/lgpd-delete-client.js'
export { ExportClientsCsv } from './application/export-clients-csv.js'
export { GetClient } from './application/get-client.js'
export { ListClients } from './application/list-clients.js'
export { UpdateClient } from './application/update-client.js'

export { clientImportRowSchema } from './application/client-import-schema.js'
export type { ClientImportRow } from './application/client-import-schema.js'
export { ParseClientImport } from './application/parse-client-import.js'

// Infrastructure
export { ClientMapper } from './infrastructure/client-mapper.js'
export { PrismaClientRepository } from './infrastructure/prisma-client-repository.js'
