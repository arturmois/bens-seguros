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
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { createClientRoute } from '../create-client.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createClientRoute)
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
  name: 'João Silva',
  document: '12345678901',
  personType: 'INDIVIDUAL',
  type: 'CLIENT',
  email: 'joao@email.com',
  phone: '11999999999',
  birthDate: null,
  profession: null,
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

describe('POST /api/v1/clients', () => {
  it('returns 201 with client detail on valid INDIVIDUAL creation', async () => {
    mockExecute.mockResolvedValue(makeClient())

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: {
        name: 'João Silva',
        document: '12345678901',
        personType: 'INDIVIDUAL',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('João Silva')
    expect(body.data.personType).toBe('INDIVIDUAL')
  })

  it('returns 201 for COMPANY with 14-digit document', async () => {
    mockExecute.mockResolvedValue(
      makeClient({
        document: '12345678000195',
        personType: 'COMPANY',
        name: 'Empresa Ltda',
      })
    )

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: {
        name: 'Empresa Ltda',
        document: '12345678000195',
        personType: 'COMPANY',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.personType).toBe('COMPANY')
  })

  it('sets salespersonId when role is COMMERCIAL', async () => {
    setTestContext({ role: 'COMMERCIAL' })
    mockResolve(mockExecute)
    mockExecute.mockResolvedValue(makeClient({ salespersonId: TEST_USER_ID }))

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: {
        name: 'João Silva',
        document: '12345678901',
        personType: 'INDIVIDUAL',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ salespersonId: TEST_USER_ID })
    )
  })

  it('returns 400 when INDIVIDUAL document has 14 digits', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: {
        name: 'João Silva',
        document: '12345678000195',
        personType: 'INDIVIDUAL',
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when COMPANY document has 11 digits', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: {
        name: 'Empresa Ltda',
        document: '12345678901',
        personType: 'COMPANY',
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 409 when client already exists', async () => {
    mockResolveError('CLIENT_ALREADY_EXISTS', 'Client already exists')

    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: {
        name: 'João Silva',
        document: '12345678901',
        personType: 'INDIVIDUAL',
      },
    })

    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CLIENT_ALREADY_EXISTS')
  })

  it('returns 400 when name is too short', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: {
        name: 'J',
        document: '12345678901',
        personType: 'INDIVIDUAL',
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
