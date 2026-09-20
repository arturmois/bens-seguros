import { describe, expect, it, vi } from 'vitest'
import type { ClientRepository } from '@repo/core'
import { createTestApp } from '../__tests__/helpers/create-test-app.js'
import { createClientRoutes } from '../routes/v1/clients/index.js'
import { composeServerClients } from './compose.js'

const REQUIRED_CLIENTS_API_KEYS = [
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
    findByIdWithMetrics: vi.fn(),
    findByDocumentHash: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    lgpdAnonymize: vi.fn(),
  }
}

describe('composeServerClients', () => {
  it('composeServerClients returns ClientsApi from composeClients', () => {
    const graph = composeServerClients(fakeRepo())
    expect(graph.clients.getClient.execute).toEqual(expect.any(Function))
    expect(Object.keys(graph.clients).sort()).toEqual(
      [...REQUIRED_CLIENTS_API_KEYS].sort()
    )
  })

  it('createClientRoutes registers from composed graph', async () => {
    const graph = composeServerClients(fakeRepo())
    const app = await createTestApp(createClientRoutes(graph.clients))
    expect(app.hasRoute({ method: 'GET', url: '/api/v1/clients/:id' })).toBe(
      true
    )
    await app.close()
  })

  it('composed graph requires deleteClient', () => {
    expect(REQUIRED_CLIENTS_API_KEYS).toContain('deleteClient')
    const graph = composeServerClients(fakeRepo())
    expect(graph.clients.deleteClient).toBeDefined()
  })

  it('composed graph requires lgpdDeleteClient', () => {
    expect(REQUIRED_CLIENTS_API_KEYS).toContain('lgpdDeleteClient')
    const graph = composeServerClients(fakeRepo())
    expect(graph.clients.lgpdDeleteClient).toBeDefined()
  })
})

describe('forTenant', () => {
  it('forTenant calls createTenantClient not prismaAdmin', async () => {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const composePath = fileURLToPath(new URL('./compose.ts', import.meta.url))
    const source = readFileSync(composePath, 'utf8')
    expect(source).not.toMatch(/prismaAdmin/)
    const { forTenant } = await import('./compose.js')
    const graph = forTenant('org-hmac-1')
    expect(source).toMatch(/createTenantClient\(organizationId\)/)
    expect(graph.captureLead.execute).toEqual(expect.any(Function))
    expect(graph.listProposalsForClient.execute).toEqual(expect.any(Function))
    expect(graph.updateClientFiscal.execute).toEqual(expect.any(Function))
  })
})
