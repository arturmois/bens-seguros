import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import multipart from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'
import {
  createTestApp,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { buildMultipartBody } from '../../../../__tests__/helpers/multipart.js'
import { uploadLogoRoute } from '../upload-logo.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()

async function registerRoute(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })
  uploadLogoRoute(app)
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(registerRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('PUT /api/v1/organization/logo', () => {
  it('rejects non-multipart requests with 4xx status', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/organization/logo',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
    expect(response.statusCode).toBeLessThan(500)
  })
  it('returns 200 with logo URL on successful PNG upload', async () => {
    mockExecute.mockResolvedValue({
      view: {
        id: TEST_ORG_ID,
        name: 'Corretora Atualizada',
        slug: 'corretora-atualizada',
        logo: 'https://cdn.example.com/logo.png',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      previousLogoKey: null,
    })
    const boundary = '----TestBoundary1234567890'
    const imageContent = Buffer.from('fake-png-image-data')
    const body = buildMultipartBody(
      'file',
      'logo.png',
      'image/png',
      imageContent,
      boundary
    )
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/organization/logo',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      payload: body,
    })
    expect(response.statusCode).toBe(200)
    const json = response.json()
    expect(json.success).toBe(true)
    expect(json.data.logo).toBe('https://cdn.example.com/logo.png')
  })
  it('returns 400 when file type is not an allowed image type', async () => {
    mockResolveError('INVALID_LOGO_FILE_TYPE', 'Unsupported logo MIME type')
    const boundary = '----TestBoundary9999'
    const fileContent = Buffer.from('console.log("malicious")')
    const body = buildMultipartBody(
      'file',
      'script.js',
      'application/javascript',
      fileContent,
      boundary
    )
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/organization/logo',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      payload: body,
    })
    expect(response.statusCode).toBe(400)
    const json = response.json()
    expect(json.error.code).toBe('INVALID_LOGO_FILE_TYPE')
  })
})
