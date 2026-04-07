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
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { getDocumentUrlRoute } from '../get-document-url.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getDocumentUrlRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/documents/:id/url', () => {
  it('returns 200 with signed URL on valid document id', async () => {
    mockExecute.mockResolvedValue(
      'https://cdn.example.com/documents/doc-id-001.pdf'
    )

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/documents/doc-id-001/url',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.url).toBe(
      'https://cdn.example.com/documents/doc-id-001.pdf'
    )
  })

  it('returns 404 when document is not found', async () => {
    mockResolveError('DOCUMENT_NOT_FOUND', 'Document not found')

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/documents/nonexistent-id/url',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('DOCUMENT_NOT_FOUND')
  })
})
