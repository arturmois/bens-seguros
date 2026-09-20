import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { UpdateClientFiscal } from '@repo/core'
import type { ClientRepository } from '@repo/core'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { updateClientRoute } from '../update-client.js'

const mockUpdate = vi.fn()
const mockFindById = vi.fn()

function fiscalRepo(): ClientRepository {
  return {
    save: vi.fn(),
    findById: mockFindById,
    findByIdWithMetrics: vi.fn(),
    findByDocumentHash: vi.fn(),
    findMany: vi.fn(),
    update: mockUpdate,
    softDelete: vi.fn(),
    lgpdAnonymize: vi.fn(),
  }
}

const existingClient = {
  id: 'client-001',
  organizationId: TEST_ORG_ID,
  legalName: 'João Silva',
  document: '11144477735',
  documentHash: 'hash',
  personType: 'INDIVIDUAL' as const,
  profession: null,
  maritalStatus: null,
  address: null,
  fiscalBirthDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  const fiscal = new UpdateClientFiscal(fiscalRepo())
  app = await createTestApp((fastify) =>
    updateClientRoute(fastify, {
      updateClientFiscalFor: () => fiscal,
    })
  )
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockFindById.mockResolvedValue(existingClient)
  mockUpdate.mockResolvedValue(existingClient)
})

describe('PUT /api/internal/clients/:id', () => {
  it('returns 404 when client does not exist', async () => {
    mockFindById.mockResolvedValue(null)
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/clients/nonexistent',
      payload: { email: 'novo@example.com' },
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('CLIENT_NOT_FOUND')
    expect(body.error.message).toBe('Client not found')
  })

  it('returns 400 when document has invalid length', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/clients/client-001',
      payload: { document: '123' },
    })
    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.error.code).toBe('INVALID_DOCUMENT')
  })

  it('persists fiscal document fields when a valid document is provided', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/clients/client-001',
      payload: { document: '123.456.789-09' },
    })
    expect(response.statusCode).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      'client-001',
      TEST_ORG_ID,
      expect.objectContaining({
        document: expect.any(String),
        documentHash: expect.any(String),
        documentEncrypted: expect.any(String),
      })
    )
  })

  it('updates multiple fields in a single request', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/clients/client-001',
      payload: {
        email: 'joao@example.com',
        profession: 'Engenheiro',
        maritalStatus: 'MARRIED',
      },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.message).toBe('Dados do cliente atualizados')
  })
})
