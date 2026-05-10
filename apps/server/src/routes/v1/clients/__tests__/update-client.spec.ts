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
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { updateClientRoute } from '../update-client.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(updateClientRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const makeClient = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'client-id-001',
  organizationId: TEST_ORG_ID,
  legalName: 'João Atualizado',
  document: '12345678901',
  personType: 'INDIVIDUAL',
  profession: 'Médico',
  maritalStatus: null,
  address: null,
  fiscalBirthDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
})

describe('PUT /api/v1/clients/:id', () => {
  it('returns 200 with updated client data', async () => {
    mockExecute.mockResolvedValue(makeClient({ legalName: 'João Atualizado' }))
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/clients/client-id-001',
      payload: { legalName: 'João Atualizado' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.legalName).toBe('João Atualizado')
  })
  it('accepts partial body with only profession update', async () => {
    mockExecute.mockResolvedValue(makeClient({ profession: 'Engenheiro' }))
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/clients/client-id-001',
      payload: { profession: 'Engenheiro' },
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
  })
  it('passes id and organizationId to use case', async () => {
    mockExecute.mockResolvedValue(makeClient())
    await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/clients/client-id-001',
      payload: { legalName: 'Novo Nome' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'client-id-001',
        organizationId: TEST_ORG_ID,
        legalName: 'Novo Nome',
      })
    )
  })
  it('returns 404 when client does not exist', async () => {
    mockResolveError('CLIENT_NOT_FOUND', 'Client not found')
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/clients/nonexistent-id',
      payload: { legalName: 'Novo Nome' },
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CLIENT_NOT_FOUND')
  })
  it('accepts maritalStatus update', async () => {
    mockExecute.mockResolvedValue(makeClient({ maritalStatus: 'MARRIED' }))
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/clients/client-id-001',
      payload: { maritalStatus: 'MARRIED' },
    })
    expect(response.statusCode).toBe(200)
  })
})
