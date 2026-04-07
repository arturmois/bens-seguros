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
} from '../../../../__tests__/helpers/create-test-app.js'
import { makeUpdatedOrganization } from '../../../../__tests__/helpers/factories.js'
import { buildMultipartBody } from '../../../../__tests__/helpers/multipart.js'
import { uploadLogoRoute } from '../upload-logo.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      organization: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  }
})

// Mock storage provider so upload-logo can resolve it from container
vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: {
      resolve: vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue(undefined),
        upload: vi.fn().mockResolvedValue(undefined),
        getSignedUrl: vi
          .fn()
          .mockResolvedValue('https://cdn.example.com/logo.png'),
      }),
    },
  }
})

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
})

describe('PUT /api/v1/organization/logo', () => {
  it('rejects non-multipart requests with 4xx status', async () => {
    // @fastify/multipart rejects non-multipart content-types with 406
    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/organization/logo',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    })

    // 406 Not Acceptable from @fastify/multipart when wrong content-type
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
    expect(response.statusCode).toBeLessThan(500)
  })

  it('returns 200 with logo URL on successful PNG upload', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(
      makeUpdatedOrganization({ logo: null }) as unknown as Awaited<
        ReturnType<typeof prisma.organization.findUnique>
      >
    )
    vi.mocked(prisma.organization.update).mockResolvedValue(
      makeUpdatedOrganization() as unknown as Awaited<
        ReturnType<typeof prisma.organization.update>
      >
    )

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
    expect(json.error.code).toBe('INVALID_FILE_TYPE')
  })
})
