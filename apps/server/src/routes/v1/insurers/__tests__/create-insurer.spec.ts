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
import { createInsurerRoute } from '../create-insurer.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createInsurerRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const validInsurer = {
  id: 'insurer-id-001',
  organizationId: TEST_ORG_ID,
  name: 'Porto Seguro',
  code: 'PS',
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('POST /api/v1/insurers', () => {
  it('returns 201 with insurer data on valid request', async () => {
    mockExecute.mockResolvedValue(validInsurer)
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/insurers',
      payload: { name: 'Porto Seguro', code: 'PS' },
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Porto Seguro')
    expect(body.data.organizationId).toBe(TEST_ORG_ID)
  })
  it('returns 201 with insurer data when code is omitted', async () => {
    mockExecute.mockResolvedValue({ ...validInsurer, code: null })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/insurers',
      payload: { name: 'Bradesco Seguros' },
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.code).toBeNull()
  })
  it('returns 400 when name is empty', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/insurers',
      payload: { name: '' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when body is missing', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/insurers',
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 409 when insurer already exists', async () => {
    mockResolveError('INSURER_ALREADY_EXISTS', 'Insurer already exists')
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/insurers',
      payload: { name: 'Porto Seguro', code: 'PS' },
    })
    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INSURER_ALREADY_EXISTS')
  })
})
