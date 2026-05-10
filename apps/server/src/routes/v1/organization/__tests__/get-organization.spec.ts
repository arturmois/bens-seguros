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
import { getOrganizationRoute } from '../get-organization.js'

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
  app = await createTestApp(getOrganizationRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/organization', () => {
  it('returns 200 with organization data', async () => {
    mockExecute.mockResolvedValue({
      id: TEST_ORG_ID,
      name: 'Corretora Exemplo',
      slug: 'corretora-exemplo',
      logo: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/organization',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(TEST_ORG_ID)
    expect(body.data.name).toBe('Corretora Exemplo')
    expect(body.data.slug).toBe('corretora-exemplo')
    expect(body.data.logo).toBeNull()
  })
  it('returns 404 when organization is not found', async () => {
    mockResolveError('ORGANIZATION_NOT_FOUND', 'Organization not found')
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/organization',
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('ORGANIZATION_NOT_FOUND')
  })
  it('forwards organizationId to the use case', async () => {
    mockExecute.mockResolvedValue({
      id: TEST_ORG_ID,
      name: 'Corretora Exemplo',
      slug: 'corretora-exemplo',
      logo: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })
    await injectAs(app, { method: 'GET', url: '/api/v1/organization' })
    expect(mockExecute).toHaveBeenCalledWith(TEST_ORG_ID)
  })
})
