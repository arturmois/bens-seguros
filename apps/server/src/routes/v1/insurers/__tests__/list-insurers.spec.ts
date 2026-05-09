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
import { listInsurersRoute } from '../list-insurers.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listInsurersRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeInsurer = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'insurer-id-001',
  organizationId: TEST_ORG_ID,
  name: 'Porto Seguro',
  code: 'PS',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('GET /api/v1/insurers', () => {
  it('returns 200 with paginated insurer list', async () => {
    mockExecute.mockResolvedValue({
      items: [makeInsurer()],
      nextCursor: null,
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/insurers',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Porto Seguro')
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns 200 with empty list when no insurers exist', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/insurers',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
  })

  it('returns 200 with nextCursor when more pages exist', async () => {
    const insurers = Array.from({ length: 2 }, (_, i) =>
      makeInsurer({ id: `insurer-id-00${i + 1}`, name: `Insurer ${i + 1}` })
    )
    mockExecute.mockResolvedValue({
      items: insurers,
      nextCursor: 'insurer-id-002',
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/insurers',
      query: { limit: '2' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.meta.nextCursor).toBe('insurer-id-002')
  })

  it('returns 400 when limit is out of range', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/insurers',
      query: { limit: '0' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('forwards active=true to the use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/insurers',
      query: { active: 'true' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ active: true }),
      expect.anything()
    )
  })

  it('forwards active=false to the use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/insurers',
      query: { active: 'false' },
    })

    expect(response.statusCode).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ active: false }),
      expect.anything()
    )
  })

  it('omits active when not provided', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/insurers',
    })

    expect(response.statusCode).toBe(200)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ active: undefined }),
      expect.anything()
    )
  })

  it('returns 400 when active is not "true" or "false"', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/insurers',
      query: { active: 'invalid' },
    })

    expect(response.statusCode).toBe(400)
  })
})
