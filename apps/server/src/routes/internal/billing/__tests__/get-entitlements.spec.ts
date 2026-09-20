import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { DEFAULT_PERMISSIVE_ENTITLEMENTS } from '@repo/auth/entitlements'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { getInternalEntitlementsRoute } from '../get-entitlements.js'

const mockExecute = vi.fn()

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp((fastify) =>
    getInternalEntitlementsRoute(fastify, {
      getEntitlementsFor: () => ({ execute: mockExecute }),
    })
  )
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue({
    ...DEFAULT_PERMISSIVE_ENTITLEMENTS,
    maxChannels: 5,
  })
})

describe('GET /api/internal/billing/entitlements/:organizationId', () => {
  it('200 maxChannels from GetEntitlementsForOrg', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: `/api/internal/billing/entitlements/${TEST_ORG_ID}`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.maxChannels).toBe(5)
    expect(mockExecute).toHaveBeenCalledWith(TEST_ORG_ID)
  })

  it('200 DEFAULT_PERMISSIVE_ENTITLEMENTS trialEndsAt null', async () => {
    mockExecute.mockResolvedValue(DEFAULT_PERMISSIVE_ENTITLEMENTS)
    const response = await injectAs(app, {
      method: 'GET',
      url: `/api/internal/billing/entitlements/${TEST_ORG_ID}`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual({
      ...DEFAULT_PERMISSIVE_ENTITLEMENTS,
      trialEndsAt: null,
    })
  })

  it('403 TENANT_MISMATCH when path org differs from HMAC', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/internal/billing/entitlements/org-other',
    })
    expect(response.statusCode).toBe(403)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('TENANT_MISMATCH')
    expect(mockExecute).not.toHaveBeenCalled()
  })
})
