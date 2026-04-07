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
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { uploadDocumentRoute } from '../upload-document.js'

const mockExecute = vi.fn()

async function registerRoute(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })
  uploadDocumentRoute(app)
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

function buildMultipartBody(
  fieldName: string,
  filename: string,
  mimeType: string,
  content: Buffer,
  boundary: string
): Buffer {
  const header =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  const footer = `\r\n--${boundary}--\r\n`
  return Buffer.concat([Buffer.from(header), content, Buffer.from(footer)])
}

const makeDocument = () => ({
  id: 'doc-id-001',
  organizationId: TEST_ORG_ID,
  entityType: 'CLIENT' as const,
  entityId: 'client-id-001',
  clientId: null,
  type: 'OTHER' as const,
  fileName: 'document.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  storageKey: 'documents/doc-id-001/document.pdf',
  url: null,
  createdBy: null,
  createdAt: new Date().toISOString(),
})

describe('POST /api/v1/documents/upload', () => {
  it('returns 201 with document data on valid file upload', async () => {
    mockExecute.mockResolvedValue(makeDocument())

    const boundary = '----TestBoundary1234567890'
    const fileContent = Buffer.from('fake-pdf-content')
    const body = buildMultipartBody(
      'file',
      'document.pdf',
      'application/pdf',
      fileContent,
      boundary
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/upload?entityType=CLIENT&entityId=client-id-001',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      payload: body,
    })

    expect(response.statusCode).toBe(201)
    const json = response.json()
    expect(json.success).toBe(true)
    expect(json.data.organizationId).toBe(TEST_ORG_ID)
    expect(json.data.entityType).toBe('CLIENT')
  })

  it('returns 400 when no file is provided in multipart body', async () => {
    const boundary = '----TestBoundaryEmpty'
    const emptyBody = `--${boundary}--\r\n`

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/upload?entityType=CLIENT&entityId=client-id-001',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(Buffer.byteLength(emptyBody)),
      },
      payload: Buffer.from(emptyBody),
    })

    expect(response.statusCode).toBe(400)
    const json = response.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('FILE_REQUIRED')
  })

  it('rejects request when entityType query param is missing', async () => {
    const boundary = '----TestBoundaryQuery'
    const fileContent = Buffer.from('content')
    const body = buildMultipartBody(
      'file',
      'doc.pdf',
      'application/pdf',
      fileContent,
      boundary
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/upload?entityId=client-id-001',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      payload: body,
    })

    // Multipart routes return 4xx when querystring validation fails
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })

  it('rejects request when entityId query param is missing', async () => {
    const boundary = '----TestBoundaryEntityId'
    const fileContent = Buffer.from('content')
    const body = buildMultipartBody(
      'file',
      'doc.pdf',
      'application/pdf',
      fileContent,
      boundary
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/documents/upload?entityType=POLICY',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      payload: body,
    })

    // Multipart routes return 4xx when querystring validation fails
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
})
