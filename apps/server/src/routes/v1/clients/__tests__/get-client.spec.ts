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
    mockResolve(mockExecute)
    mockExecute.mockResolvedValue(makeClient({ document: '98765432100' }))

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/client-id-001',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    // Document masking is applied at the use-case layer (not exercised here);
    // this test asserts only that VIEWER access succeeds.
    expect(typeof body.data.document).toBe('string')
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
    mockResolve(mockExecute)
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
