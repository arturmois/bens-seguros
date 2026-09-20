import { describe, expect, it, vi } from 'vitest'
import { composeClients } from './compose-clients.js'
import { GetClient } from './application/get-client.js'
import type { ClientRepository } from './domain/client-repository.js'

const CLIENTS_API_KEYS = [
  'createClient',
  'listClients',
  'getClient',
  'updateClient',
  'deleteClient',
  'lgpdDeleteClient',
  'exportClientsCsv',
  'parseClientImport',
] as const

function fakeRepo(): ClientRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByIdWithMetrics: vi.fn().mockResolvedValue(null),
    findByDocumentHash: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    lgpdAnonymize: vi.fn(),
  }
}

describe('composeClients', () => {
  it('composeClients returns the eight ClientsApi keys', () => {
    const api = composeClients(fakeRepo())
    expect(Object.keys(api).sort()).toEqual([...CLIENTS_API_KEYS].sort())
  })

  it('composeClients getClient.execute is GetClient', async () => {
    const repo = fakeRepo()
    const api = composeClients(repo)
    expect(api.getClient).toBeInstanceOf(GetClient)
    await expect(
      api.getClient.execute({ id: 'missing', organizationId: 'org-1' })
    ).rejects.toMatchObject({ code: 'CLIENT_NOT_FOUND' })
    expect(repo.findByIdWithMetrics).toHaveBeenCalledWith('missing', 'org-1')
  })
})
