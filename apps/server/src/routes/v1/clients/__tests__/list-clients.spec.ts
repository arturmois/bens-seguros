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
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listClientsRoute } from '../list-clients.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listClientsRoute)
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
  legalName: 'João Silva',
  document: '12345678901',
  personType: 'INDIVIDUAL',
  profession: null,
  maritalStatus: null,
  address: null,
  fiscalBirthDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  activePolicyCount: 0,
  totalPolicyCount: 0,
  contactCount: 1,
  ...overrides,
})

describe('GET /api/v1/clients', () => {
  it('returns 200 with paginated clients list', async () => {
    mockExecute.mockResolvedValue({
      items: [makeClient()],
      nextCursor: null,
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].legalName).toBe('João Silva')
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns 200 with empty list when no clients exist', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(0)
  })

  it('passes hasActivePolicy filter to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
      query: { hasActivePolicy: 'true' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ hasActivePolicy: true })
    )
  })

  it('passes search filter to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
      query: { search: 'joao' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'joao' })
    )
  })

  it('returns 400 when sortBy has invalid value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
      query: { sortBy: 'INVALID' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 200 with nextCursor when more pages exist', async () => {
    const cursor = 'cursor-abc'
    mockExecute.mockResolvedValue({
      items: [makeClient()],
      nextCursor: cursor,
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).toBe(cursor)
  })
})
