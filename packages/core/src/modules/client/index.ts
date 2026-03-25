// Domain
export type {
  ClientData,
  ClientAddress,
  ClientFilters,
  ClientRepository,
  CursorPage,
  Page,
  CreateClientInput,
  UpdateClientInput,
} from './domain/client-repository.js'
export {
  ClientNotFoundError,
  ClientAlreadyExistsError,
  ClientErrors,
} from './domain/client-errors.js'

// Application
export { ExportClientsCsv } from './application/export-clients-csv.js'
export { CreateClient } from './application/create-client.js'
export { ListClients } from './application/list-clients.js'
export { GetClient } from './application/get-client.js'
export { UpdateClient } from './application/update-client.js'
export { DeleteClient } from './application/delete-client.js'
export { ClientPresenter } from './application/client-presenter.js'
export type {
  ClientListItem,
  ClientDetail,
  PresenterContext,
} from './application/client-presenter.js'

export { ParseClientImport } from './application/parse-client-import.js'
export { clientImportRowSchema } from './application/client-import-schema.js'
export type { ClientImportRow } from './application/client-import-schema.js'

// Infrastructure
export { ClientMapper } from './infrastructure/client-mapper.js'
export { PrismaClientRepository } from './infrastructure/prisma-client-repository.js'
