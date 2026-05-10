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
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listTenantsRoute } from '../list-tenants.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listTenantsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/tenants', () => {
  it('returns 200 with tenant list for authenticated user', async () => {
    mockExecute.mockResolvedValue([
      {
        id: TEST_ORG_ID,
        name: 'Corretora Exemplo',
        slug: 'corretora-exemplo',
        logo: null,
        role: 'OWNER',
      },
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/tenants',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe(TEST_ORG_ID)
    expect(body.data[0].role).toBe('OWNER')
  })
  it('returns 200 with empty list when user has no memberships', async () => {
    mockExecute.mockResolvedValue([])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/tenants',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(0)
  })
  it('forwards the authenticated user id to the use case', async () => {
    mockExecute.mockResolvedValue([])
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/tenants',
    })
    expect(mockExecute).toHaveBeenCalledWith(TEST_USER_ID)
  })
})
