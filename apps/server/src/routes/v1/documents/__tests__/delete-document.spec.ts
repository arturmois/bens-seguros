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
import { deleteDocumentRoute } from '../delete-document.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(deleteDocumentRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('DELETE /api/v1/documents/:id', () => {
  it('returns 204 on successful deletion', async () => {
    mockExecute.mockResolvedValue(undefined)

    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/documents/doc-id-001',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(204)
  })

  it('returns 404 when document is not found', async () => {
    mockResolveError('DOCUMENT_NOT_FOUND', 'Document not found')

    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/documents/nonexistent-id',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('DOCUMENT_NOT_FOUND')
  })
})
