import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import multipart from '@fastify/multipart'
import type { FastifyInstance } from 'fastify'
import {
  createTestApp,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { buildMultipartBody } from '../../../../__tests__/helpers/multipart.js'
import type { DocumentUploadApi } from '../upload-document.js'
import { uploadDocumentRoute } from '../upload-document.js'

const mockUploadExecute = vi.fn()
const mockAttachExecute = vi.fn()

const docs: DocumentUploadApi = {
  uploadDocument: { execute: mockUploadExecute },
  attachProposalDocument: { execute: mockAttachExecute },
} as unknown as DocumentUploadApi

async function registerRoute(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })
  uploadDocumentRoute(app, docs)
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
    mockUploadExecute.mockResolvedValue(makeDocument())
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
  it('CLIENT entityType calls uploadDocument not attachProposalDocument', async () => {
    mockUploadExecute.mockResolvedValue(makeDocument())
    const boundary = '----TestBoundaryClient'
    const fileContent = Buffer.from('fake-pdf-content')
    const body = buildMultipartBody(
      'file',
      'document.pdf',
      'application/pdf',
      fileContent,
      boundary
    )
    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/upload?entityType=CLIENT&entityId=client-id-001',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      payload: body,
    })
    expect(mockUploadExecute).toHaveBeenCalledOnce()
    expect(mockAttachExecute).not.toHaveBeenCalled()
  })
  it('PROPOSAL entityType calls attachProposalDocument not uploadDocument', async () => {
    mockAttachExecute.mockResolvedValue({
      ...makeDocument(),
      entityType: 'PROPOSAL',
      entityId: 'prop-1',
    })
    const boundary = '----TestBoundaryProposal'
    const fileContent = Buffer.from('fake-pdf-content')
    const body = buildMultipartBody(
      'file',
      'cnh.pdf',
      'application/pdf',
      fileContent,
      boundary
    )
    await app.inject({
      method: 'POST',
      url: '/api/v1/documents/upload?entityType=PROPOSAL&entityId=prop-1&type=DRIVER_LICENSE',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      payload: body,
    })
    expect(mockAttachExecute).toHaveBeenCalledOnce()
    expect(mockUploadExecute).not.toHaveBeenCalled()
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
    expect(response.statusCode).toBeGreaterThanOrEqual(400)
  })
})
