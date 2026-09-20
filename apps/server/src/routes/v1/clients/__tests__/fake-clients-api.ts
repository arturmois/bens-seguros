import type { ClientsApi } from '@repo/core'
import { vi } from 'vitest'

export function domainError(
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return Object.assign(new Error(message), { code, details })
}

export function createFakeClientsApi() {
  const execute = vi.fn()
  const generateCsvRows = vi.fn()
  const useCase = { execute }
  const clients = {
    createClient: useCase,
    listClients: useCase,
    getClient: useCase,
    updateClient: useCase,
    deleteClient: useCase,
    lgpdDeleteClient: useCase,
    exportClientsCsv: { generateCsvRows },
    parseClientImport: useCase,
  } as unknown as ClientsApi
  return { clients, execute, generateCsvRows }
}
