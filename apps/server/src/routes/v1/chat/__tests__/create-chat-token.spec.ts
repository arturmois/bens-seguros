import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import jwt from 'jsonwebtoken'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { createChatTokenRoute } from '../create-chat-token.js'

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createChatTokenRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

// This route has no body — override content-type to avoid Fastify empty-body rejection
const NO_BODY_HEADERS = { 'content-type': 'text/plain' }

describe('POST /api/v1/chat/token', () => {
  it('returns 200 with a valid JWT token for authenticated user', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/chat/token',
      headers: NO_BODY_HEADERS,
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(typeof body.data.token).toBe('string')

    const decoded = jwt.verify(
      body.data.token,
      'test-socket-secret-16'
    ) as Record<string, unknown>
    expect(decoded.userId).toBe(TEST_USER_ID)
    expect(decoded.organizationId).toBe(TEST_ORG_ID)
    expect(decoded.role).toBe('OWNER')
    expect(decoded.name).toBe('Test User')
  })

  it('returns 401 when user has no id', async () => {
    setTestContext({
      user: {
        id: '',
        name: 'Test',
        emailVerified: true,
        image: null,
        isSuperAdmin: false,
        email: 'x@y.com',
      },
    })

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/chat/token',
      headers: NO_BODY_HEADERS,
    })

    expect(response.statusCode).toBe(401)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when organizationId is missing', async () => {
    setTestContext({ organizationId: null })

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/chat/token',
      headers: NO_BODY_HEADERS,
    })

    expect(response.statusCode).toBe(401)
    const body = response.json()
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when role is missing', async () => {
    setTestContext({ role: null })

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/chat/token',
      headers: NO_BODY_HEADERS,
    })

    expect(response.statusCode).toBe(401)
  })
})
