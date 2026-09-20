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
import { createFakeClientsApi } from './fake-clients-api.js'
import { exportClientsRoute } from '../export-clients.js'

const { clients, generateCsvRows } = createFakeClientsApi()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp((instance) => exportClientsRoute(instance, clients))
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

async function* makeCsvGenerator(rows: string[] = []) {
  yield 'Nome,CPF/CNPJ,Tipo,Email,Telefone\n'
  for (const row of rows) {
    yield row
  }
}

describe('GET /api/v1/clients/export', () => {
  it('returns 200 with text/csv content type', async () => {
    generateCsvRows.mockReturnValue(makeCsvGenerator())
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
  })
  it('returns CSV attachment header', async () => {
    generateCsvRows.mockReturnValue(makeCsvGenerator())
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
    })
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="clientes.csv"'
    )
  })
  it('streams CSV rows in response body', async () => {
    generateCsvRows.mockReturnValue(
      makeCsvGenerator([
        'João Silva,12345678901,CLIENT,joao@email.com,11999999999\n',
      ])
    )
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Nome,CPF/CNPJ')
    expect(response.body).toContain('João Silva')
  })
  it('passes filters to use case', async () => {
    generateCsvRows.mockReturnValue(makeCsvGenerator())
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
      query: { hasActivePolicy: 'true', search: 'joao' },
    })
    expect(generateCsvRows).toHaveBeenCalledWith(
      expect.objectContaining({ hasActivePolicy: true, search: 'joao' })
    )
  })
  it('passes personTypeIn to ExportClientsCsv', async () => {
    generateCsvRows.mockReturnValue(makeCsvGenerator())
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
      query: { personTypeIn: 'COMPANY' },
    })
    expect(generateCsvRows).toHaveBeenCalledWith(
      expect.objectContaining({ personTypeIn: ['COMPANY'] })
    )
  })
})
