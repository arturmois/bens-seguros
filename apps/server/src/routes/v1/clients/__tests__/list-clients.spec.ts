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
  name: 'João Silva',
  document: '12345678901',
  personType: 'INDIVIDUAL',
  type: 'CLIENT',
  email: 'joao@email.com',
  phone: '11999999999',
  birthDate: null,
  profession: null,
  maritalStatus: null,
  address: null,
  socialMedia: null,
  tags: [],
  consentLgpd: false,
  salespersonId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('GET /api/v1/clients', () => {
  it('returns 200 with paginated clients list', async () => {
    mockExecute.mockResolvedValue({
      items: [makeClient()],
      total: 1,
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
    expect(body.data[0].name).toBe('João Silva')
    expect(body.meta.total).toBe(1)
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns 200 with empty list when no clients exist', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(0)
  })

  it('passes type filter to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
      query: { type: 'LEAD' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LEAD' }),
      expect.any(Object)
    )
  })

  it('passes search filter to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], total: 0, nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
      query: { search: 'joao' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'joao' }),
      expect.any(Object)
    )
  })

  it('returns 400 when type has invalid value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients',
      query: { type: 'INVALID' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 200 with nextCursor when more pages exist', async () => {
    const cursor = 'cursor-abc'
    mockExecute.mockResolvedValue({
      items: [makeClient()],
      total: 10,
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
