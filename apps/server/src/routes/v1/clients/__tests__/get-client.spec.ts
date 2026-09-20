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
import { createFakeClientsApi, domainError } from './fake-clients-api.js'
import { getClientRoute } from '../get-client.js'

const { clients, execute: mockExecute } = createFakeClientsApi()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp((instance) => getClientRoute(instance, clients))
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

const makeClient = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'client-id-001',
  organizationId: TEST_ORG_ID,
  legalName: 'Maria Souza',
  document: '98765432100',
  personType: 'INDIVIDUAL',
  profession: 'Engenheira',
  maritalStatus: null,
  address: null,
  fiscalBirthDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  activePolicyCount: 0,
  totalPolicyCount: 0,
  contactCount: 0,
  ...overrides,
})

describe('GET /api/v1/clients/:id', () => {
  it('returns 200 with client detail on valid request', async () => {
    mockExecute.mockResolvedValue(makeClient())
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/client-id-001',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.legalName).toBe('Maria Souza')
    expect(body.data.id).toBe('client-id-001')
  })
  it('returns 200 with client document for VIEWER role', async () => {
    setTestContext({ role: 'VIEWER' })
    mockExecute.mockResolvedValue(makeClient({ document: '98765432100' }))
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/client-id-001',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(typeof body.data.document).toBe('string')
  })
  it('returns 404 when client does not exist', async () => {
    mockExecute.mockRejectedValue(
      domainError('CLIENT_NOT_FOUND', 'Client not found')
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/nonexistent-id',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CLIENT_NOT_FOUND')
  })
  it('passes id and organizationId to use case', async () => {
    mockExecute.mockResolvedValue(makeClient())
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/client-id-001',
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'client-id-001',
        organizationId: TEST_ORG_ID,
      })
    )
  })
  it('returns fiscal fields for OWNER role', async () => {
    setTestContext({ role: 'OWNER' })
    mockExecute.mockResolvedValue(
      makeClient({ profession: 'Engenheira', maritalStatus: 'SINGLE' })
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/client-id-001',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.profession).toBe('Engenheira')
    expect(body.data.maritalStatus).toBe('SINGLE')
  })
})
