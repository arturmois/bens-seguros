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
import { getCepRoute } from '../get-cep.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getCepRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/cep/:cep', () => {
  it('returns 200 with AddressData on successful lookup', async () => {
    mockExecute.mockResolvedValue({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: null,
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/cep/01311-000',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.street).toBe('Avenida Paulista')
    expect(mockExecute).toHaveBeenCalledWith({ cep: '01311000' })
  })
  it('returns 400 when CEP is malformed', async () => {
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/cep/123',
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 404 when LookupCep throws CepNotFoundError', async () => {
    mockResolveError('CEP_NOT_FOUND', 'CEP não encontrado.')
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/cep/00000000',
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('CEP_NOT_FOUND')
  })
  it('returns 502 when LookupCep throws CepProviderUnavailableError', async () => {
    mockResolveError('CEP_PROVIDER_UNAVAILABLE', 'Serviço de CEP indisponível.')
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/cep/01311000',
    })
    expect(response.statusCode).toBe(502)
    expect(response.json().error.code).toBe('CEP_PROVIDER_UNAVAILABLE')
  })
})
