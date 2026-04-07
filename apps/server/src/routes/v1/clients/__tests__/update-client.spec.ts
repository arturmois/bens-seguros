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
  name: 'João Atualizado',
  document: '12345678901',
  personType: 'INDIVIDUAL',
  type: 'CLIENT',
  email: 'joao@email.com',
  phone: '11999999999',
  birthDate: null,
  profession: 'Médico',
  maritalStatus: null,
  address: null,
  socialMedia: null,
  tags: [],
  consentLgpd: false,
  salespersonId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('PUT /api/v1/clients/:id', () => {
  it('returns 200 with updated client data', async () => {
    mockExecute.mockResolvedValue(makeClient({ name: 'João Atualizado' }))

    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/clients/client-id-001',
      payload: { name: 'João Atualizado' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('João Atualizado')
  })

  it('accepts partial body with only email update', async () => {
    mockExecute.mockResolvedValue(makeClient({ email: 'novo@email.com' }))

    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/clients/client-id-001',
      payload: { email: 'novo@email.com' },
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
      payload: { name: 'Novo Nome' },
    })

    expect(mockExecute).toHaveBeenCalledWith(
      'client-id-001',
      TEST_ORG_ID,
      expect.objectContaining({ name: 'Novo Nome' })
    )
  })

  it('returns 404 when client does not exist', async () => {
    mockResolveError('CLIENT_NOT_FOUND', 'Client not found')

    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/clients/nonexistent-id',
      payload: { name: 'Novo Nome' },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CLIENT_NOT_FOUND')
  })

  it('accepts tags update', async () => {
    mockExecute.mockResolvedValue(makeClient({ tags: ['vip', 'indicação'] }))

    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/clients/client-id-001',
      payload: { tags: ['vip', 'indicação'] },
    })

    expect(response.statusCode).toBe(200)
  })
})
