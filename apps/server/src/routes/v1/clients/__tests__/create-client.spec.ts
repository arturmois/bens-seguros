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
import { createFakeClientsApi, domainError } from './fake-clients-api.js'
import { createClientRoute } from '../create-client.js'

const { clients, execute: mockExecute } = createFakeClientsApi()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp((instance) => createClientRoute(instance, clients))
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

const VALID_BODY = {
  legalName: 'Acme Ltda',
  document: '12345678000190',
  personType: 'COMPANY' as const,
}

const SAVED_CLIENT = {
  id: 'client-1',
  organizationId: TEST_ORG_ID,
  legalName: 'Acme Ltda',
  document: '12345678000190',
  documentHash: 'hash',
  personType: 'COMPANY' as const,
  profession: null,
  maritalStatus: null,
  address: null,
  fiscalBirthDate: null,
  createdAt: new Date('2026-05-03T00:00:00Z'),
  updatedAt: new Date('2026-05-03T00:00:00Z'),
  deletedAt: null,
  activePolicyCount: 0,
  totalPolicyCount: 0,
  contactCount: 0,
}

describe('POST /api/v1/clients', () => {
  it('cria cliente válido (201) com métricas zeradas', async () => {
    mockExecute.mockResolvedValue(SAVED_CLIENT)
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: VALID_BODY,
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe('client-1')
    expect(body.data.activePolicyCount).toBe(0)
    expect(body.data.totalPolicyCount).toBe(0)
    expect(body.data.contactCount).toBe(0)
  })
  it('retorna 409 com details.existingClientId quando documento já existe', async () => {
    mockExecute.mockRejectedValue(
      domainError(
        'CLIENT_ALREADY_EXISTS',
        'Já existe cliente com este documento na organização',
        { existingClientId: 'client-existing-42' }
      )
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: VALID_BODY,
    })
    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CLIENT_ALREADY_EXISTS')
    expect(body.error.details).toEqual({
      existingClientId: 'client-existing-42',
    })
  })
  it('retorna 400 quando legalName ausente (validação Zod)', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: { document: '12345678000190', personType: 'COMPANY' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('retorna 400 quando document tem menos de 11 caracteres', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: { legalName: 'X', document: '123', personType: 'INDIVIDUAL' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('passa organizationId do request ao use case', async () => {
    mockExecute.mockResolvedValue(SAVED_CLIENT)
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/clients',
      payload: VALID_BODY,
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        legalName: 'Acme Ltda',
        document: '12345678000190',
        personType: 'COMPANY',
      })
    )
  })
})
