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
} from '../../../__tests__/helpers/create-test-app.js'
import { acceptTermsRoute } from '../accept-terms.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      $transaction: vi.fn(),
      user: {
        update: vi.fn(),
      },
      termsAcceptance: {
        create: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(acceptTermsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

const CURRENT_VERSION = '1.0'

describe('POST /api/terms/accept', () => {
  it('returns 200 with accepted versions on valid request', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}, {}] as unknown[])

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/terms/accept',
      payload: {
        termsVersion: CURRENT_VERSION,
        privacyVersion: CURRENT_VERSION,
      },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.termsVersion).toBe(CURRENT_VERSION)
    expect(body.data.privacyVersion).toBe(CURRENT_VERSION)
    expect(body.data.acceptedAt).toBeDefined()
  })

  it('calls prisma.$transaction to persist acceptance', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}, {}] as unknown[])

    await injectAs(app, {
      method: 'POST',
      url: '/api/terms/accept',
      payload: {
        termsVersion: CURRENT_VERSION,
        privacyVersion: CURRENT_VERSION,
      },
    })

    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledOnce()
  })

  it('returns 409 when termsVersion does not match current version', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/terms/accept',
      payload: {
        termsVersion: '0.9',
        privacyVersion: CURRENT_VERSION,
      },
    })

    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VERSION_MISMATCH')
  })

  it('returns 409 when privacyVersion does not match current version', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/terms/accept',
      payload: {
        termsVersion: CURRENT_VERSION,
        privacyVersion: '0.8',
      },
    })

    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VERSION_MISMATCH')
  })

  it('returns 400 when body is missing required fields', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/terms/accept',
      payload: {},
    })

    expect(response.statusCode).toBe(400)
  })
})
