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
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listDocumentsRoute } from '../list-documents.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listDocumentsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeDocument = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'doc-id-001',
  organizationId: TEST_ORG_ID,
  entityType: 'CLIENT',
  entityId: 'client-id-001',
  clientId: null,
  type: 'OTHER',
  fileName: 'document.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  storageKey: 'documents/doc-id-001/document.pdf',
  url: null,
  createdBy: null,
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('GET /api/v1/documents', () => {
  it('returns 200 with documents array for a given entity', async () => {
    mockExecute.mockResolvedValue([makeDocument()])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/documents',
      query: { entityType: 'CLIENT', entityId: 'client-id-001' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].entityType).toBe('CLIENT')
  })
  it('returns 200 with empty array when no documents exist', async () => {
    mockExecute.mockResolvedValue([])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/documents',
      query: { entityType: 'POLICY', entityId: 'policy-id-001' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(0)
  })
  it('returns 400 when entityType is missing', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/documents',
      query: { entityId: 'client-id-001' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when entityId is missing', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/documents',
      query: { entityType: 'CLIENT' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when entityType has an invalid value', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/documents',
      query: { entityType: 'INVALID_TYPE', entityId: 'some-id' },
    })
    expect(response.statusCode).toBe(400)
  })
})
