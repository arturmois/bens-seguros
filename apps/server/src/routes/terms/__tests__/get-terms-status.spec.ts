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
  TEST_USER_ID,
} from '../../../__tests__/helpers/create-test-app.js'
import { makeUserTermsStatus } from '../../../__tests__/helpers/factories.js'
import { getTermsStatusRoute } from '../get-terms-status.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      user: {
        findUniqueOrThrow: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getTermsStatusRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

const CURRENT_VERSION = '1.0'

describe('GET /api/terms/status', () => {
  it('returns 200 with needsReAccept false when versions match', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
      makeUserTermsStatus({
        termsVersion: CURRENT_VERSION,
        privacyVersion: CURRENT_VERSION,
      }) as unknown as Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/terms/status',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.needsReAccept).toBe(false)
    expect(body.data.currentTermsVersion).toBe(CURRENT_VERSION)
    expect(body.data.currentPrivacyVersion).toBe(CURRENT_VERSION)
    expect(body.data.userTermsVersion).toBe(CURRENT_VERSION)
  })
  it('returns 200 with needsReAccept true when user has not accepted terms', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
      makeUserTermsStatus({
        termsVersion: null,
        privacyVersion: null,
      }) as unknown as Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/terms/status',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.needsReAccept).toBe(true)
    expect(body.data.userTermsVersion).toBeNull()
    expect(body.data.userPrivacyVersion).toBeNull()
  })
  it('returns 200 with needsReAccept true when user has an older terms version', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
      makeUserTermsStatus({
        termsVersion: '0.9',
        privacyVersion: CURRENT_VERSION,
      }) as unknown as Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/terms/status',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.needsReAccept).toBe(true)
  })
  it('queries user by the authenticated user id', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(
      makeUserTermsStatus({
        termsVersion: CURRENT_VERSION,
        privacyVersion: CURRENT_VERSION,
      }) as unknown as Awaited<ReturnType<typeof prisma.user.findUniqueOrThrow>>
    )
    await injectAs(app, {
      method: 'GET',
      url: '/api/terms/status',
    })
    expect(vi.mocked(prisma.user.findUniqueOrThrow)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TEST_USER_ID },
      })
    )
  })
})
