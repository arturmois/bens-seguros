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
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { getClientRoute } from '../get-client.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getClientRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeClient = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'client-id-001',
  organizationId: TEST_ORG_ID,
  name: 'Maria Souza',
  document: '98765432100',
  personType: 'INDIVIDUAL',
  type: 'CLIENT',
  email: 'maria@email.com',
  phone: '11988887777',
  birthDate: null,
  profession: 'Engenheira',
  maritalStatus: null,
  address: null,
  socialMedia: null,
  tags: ['vip'],
  consentLgpd: true,
  salespersonId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
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
    expect(body.data.name).toBe('Maria Souza')
    expect(body.data.id).toBe('client-id-001')
  })

  it('returns 200 with masked document for VIEWER role', async () => {
    setTestContext({ role: 'VIEWER' })
    mockResolve(mockExecute)
    mockExecute.mockResolvedValue(makeClient({ document: '98765432100' }))

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/client-id-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    // VIEWER role without salesperson ownership should get masked document
    expect(body.data.document).not.toBe('98765432100')
  })

  it('returns 404 when client does not exist', async () => {
    mockResolveError('CLIENT_NOT_FOUND', 'Client not found')

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/nonexistent-id',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CLIENT_NOT_FOUND')
  })

  it('passes organizationId to use case', async () => {
    mockExecute.mockResolvedValue(makeClient())

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/client-id-001',
    })

    expect(mockExecute).toHaveBeenCalledWith('client-id-001', TEST_ORG_ID)
  })

  it('includes full PII for OWNER role', async () => {
    setTestContext({ role: 'OWNER' })
    mockResolve(mockExecute)
    mockExecute.mockResolvedValue(
      makeClient({ email: 'maria@email.com', phone: '11988887777' })
    )

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/client-id-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.email).toBe('maria@email.com')
    expect(body.data.phone).toBe('11988887777')
  })
})
