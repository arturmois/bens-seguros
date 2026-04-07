import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { updateClientRoute } from '../update-client.js'

const mockTenantPrisma = {
  client: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('@repo/db/tenant', () => ({
  createTenantClient: vi.fn(() => mockTenantPrisma),
}))

let app: Awaited<ReturnType<typeof createTestApp>>

const makeClient = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'client-001',
  organizationId: TEST_ORG_ID,
  name: 'João Silva',
  type: 'LEAD',
  deletedAt: null,
  ...overrides,
})

beforeAll(async () => {
  app = await createTestApp(updateClientRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockTenantPrisma.client.findFirst.mockResolvedValue(makeClient())
  mockTenantPrisma.client.update.mockResolvedValue(makeClient())
})

describe('PUT /api/internal/clients/:id', () => {
  it('updates email successfully', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/clients/client-001',
      payload: { email: 'novo@example.com' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.success).toBe(true)
    expect(mockTenantPrisma.client.update).toHaveBeenCalledOnce()
  })

  it('returns 404 when client does not exist', async () => {
    mockTenantPrisma.client.findFirst.mockResolvedValue(null)

    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/clients/nonexistent',
      payload: { email: 'novo@example.com' },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('CLIENT_NOT_FOUND')
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

  it('upgrades client type from LEAD to CLIENT when valid document is provided', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/internal/clients/client-001',
      payload: { document: '123.456.789-09' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockTenantPrisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'CLIENT' }),
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
    expect(body.data.message).toMatch(/atualizados/)
  })
})
