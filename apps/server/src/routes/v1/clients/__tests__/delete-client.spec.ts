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
import { deleteClientRoute } from '../delete-client.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(deleteClientRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('DELETE /api/v1/clients/:id', () => {
  it('returns 204 on successful deletion', async () => {
    mockExecute.mockResolvedValue(undefined)

    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/clients/client-id-001',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(204)
    expect(response.body).toBe('')
  })

  it('returns 404 when client does not exist', async () => {
    mockResolveError('CLIENT_NOT_FOUND', 'Client not found')

    const response = await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/clients/nonexistent-id',
      headers: { 'content-type': 'text/plain' },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CLIENT_NOT_FOUND')
  })

  it('calls use case with correct id and organizationId', async () => {
    mockExecute.mockResolvedValue(undefined)

    await injectAs(app, {
      method: 'DELETE',
      url: '/api/v1/clients/client-id-001',
      headers: { 'content-type': 'text/plain' },
    })

    expect(mockExecute).toHaveBeenCalledWith(
      'client-id-001',
      expect.any(String)
    )
  })
})
