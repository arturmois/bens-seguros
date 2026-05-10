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
import { container } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import {
  createTestApp,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { buildCsvMultipart } from '../../../../__tests__/helpers/multipart.js'
import { importPoliciesRoutes } from '../import-policies.js'

vi.mock('../../../../services/csv-import-enqueuer.js', () => ({
  stageImportData: vi.fn(),
  retrieveStagedData: vi.fn(),
  removeStagedData: vi.fn(),
  enqueueImportJob: vi.fn(),
  getImportJobStatus: vi.fn(),
}))

import {
  stageImportData,
  retrieveStagedData,
  removeStagedData,
  enqueueImportJob,
  getImportJobStatus,
} from '../../../../services/csv-import-enqueuer.js'

async function registerRoute(app: FastifyInstance) {
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })
  importPoliciesRoutes(app)
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

const TEST_JOB_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('GET /api/v1/policies/import/template', () => {
  it('returns 200 with text/csv content type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/policies/import/template',
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
  })
  it('returns CSV attachment header with correct filename', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/policies/import/template',
    })
    expect(response.headers['content-disposition']).toContain(
      'filename="modelo-apolices.csv"'
    )
  })
  it('returns CSV with header row', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/policies/import/template',
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Numero Apolice')
  })
})

describe('POST /api/v1/policies/import', () => {
  it('returns 400 when no file is sent', async () => {
    const boundary = '----ImportBoundaryEmpty'
    const emptyBody = `--${boundary}--\r\n`
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policies/import',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(Buffer.byteLength(emptyBody)),
      },
      payload: Buffer.from(emptyBody),
    })
    expect(response.statusCode).toBe(400)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NO_FILE')
  })
  it('returns 400 when file is not a CSV', async () => {
    const boundary = '----ImportBoundaryTxt'
    const header =
      `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="file"; filename="data.txt"\r\n' +
      'Content-Type: text/plain\r\n\r\n'
    const footer = `\r\n--${boundary}--\r\n`
    const body = Buffer.concat([
      Buffer.from(header),
      Buffer.from('some text content'),
      Buffer.from(footer),
    ])
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policies/import',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      payload: body,
    })
    expect(response.statusCode).toBe(400)
    const json = response.json()
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('INVALID_FORMAT')
  })
  it('returns 200 with import preview on valid CSV', async () => {
    const csvContent =
      'Numero Apolice,CPF/CNPJ Cliente,Ramo\nPOL-001,12345678901,AUTO\n'
    const boundary = '----ImportBoundaryValid'
    const body = buildCsvMultipart('apolices.csv', csvContent, boundary)
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return {
          execute: vi.fn().mockResolvedValue({
            jobId: TEST_JOB_ID,
            preview: [{ 'Numero Apolice': 'POL-001' }],
            validationSummary: { total: 1, valid: 1, invalid: 0, errors: [] },
            validRows: [{ policyNumber: 'POL-001' }],
          }),
        }
      }
      return null
    })
    vi.mocked(stageImportData).mockResolvedValue(undefined)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/policies/import',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
      payload: body,
    })
    expect(response.statusCode).toBe(200)
    const json = response.json()
    expect(json.success).toBe(true)
    expect(json.data.jobId).toBe(TEST_JOB_ID)
    expect(json.data.preview).toBeDefined()
  })
})
describe('POST /api/v1/policies/import/:jobId/confirm', () => {
  it('returns 404 when staged data does not exist', async () => {
    vi.mocked(retrieveStagedData).mockResolvedValue(null)
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/policies/import/${TEST_JOB_ID}/confirm`,
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('JOB_NOT_FOUND')
  })
  it('returns 200 and enqueues job when staged data exists', async () => {
    const rows = [{ policyNumber: 'POL-001', document: '12345678901' }]
    vi.mocked(retrieveStagedData).mockResolvedValue(rows)
    vi.mocked(enqueueImportJob).mockResolvedValue(undefined)
    vi.mocked(removeStagedData).mockResolvedValue(undefined)
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/policies/import/${TEST_JOB_ID}/confirm`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.jobId).toBe(TEST_JOB_ID)
    expect(enqueueImportJob).toHaveBeenCalledWith(
      TEST_JOB_ID,
      expect.objectContaining({
        entityType: 'policy',
        organizationId: TEST_ORG_ID,
      })
    )
  })
})
describe('GET /api/v1/policies/import/:jobId/status', () => {
  it('returns 404 when job is not found', async () => {
    vi.mocked(getImportJobStatus).mockResolvedValue({
      status: 'not_found',
      organizationId: null,
      progress: null,
      result: null,
    })
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/policies/import/${TEST_JOB_ID}/status`,
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('JOB_NOT_FOUND')
  })
  it('returns 200 with active status', async () => {
    vi.mocked(getImportJobStatus).mockResolvedValue({
      status: 'active',
      organizationId: TEST_ORG_ID,
      progress: { processed: 3, total: 10 },
      result: null,
    })
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/policies/import/${TEST_JOB_ID}/status`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('active')
  })
  it('returns 200 with completed status and result', async () => {
    vi.mocked(getImportJobStatus).mockResolvedValue({
      status: 'completed',
      organizationId: TEST_ORG_ID,
      progress: null,
      result: { imported: 5, errors: 0 },
    })
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/policies/import/${TEST_JOB_ID}/status`,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('completed')
    expect(body.data.progress).toEqual({ imported: 5, errors: 0 })
  })
  it('returns 404 when job belongs to different organization', async () => {
    vi.mocked(getImportJobStatus).mockResolvedValue({
      status: 'active',
      organizationId: 'other-org-id',
      progress: null,
      result: null,
    })
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/policies/import/${TEST_JOB_ID}/status`,
    })
    expect(response.statusCode).toBe(404)
  })
})
