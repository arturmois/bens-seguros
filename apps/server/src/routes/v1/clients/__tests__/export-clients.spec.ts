import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import { container } from '@repo/core'
import {
  createTestApp,
  injectAs,
  setTestContext,
} from '../../../../__tests__/helpers/create-test-app.js'
import { exportClientsRoute } from '../export-clients.js'

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(exportClientsRoute)
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
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return {
          generateCsvRows: vi.fn().mockReturnValue(makeCsvGenerator()),
        }
      }
      return null
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
  })

  it('returns CSV attachment header', async () => {
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return {
          generateCsvRows: vi.fn().mockReturnValue(makeCsvGenerator()),
        }
      }
      return null
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
    })

    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="clientes.csv"'
    )
  })

  it('streams CSV rows in response body', async () => {
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return {
          generateCsvRows: vi
            .fn()
            .mockReturnValue(
              makeCsvGenerator([
                'João Silva,12345678901,CLIENT,joao@email.com,11999999999\n',
              ])
            ),
        }
      }
      return null
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Nome,CPF/CNPJ')
    expect(response.body).toContain('João Silva')
  })

  it('passes filters to use case', async () => {
    const mockGenerateCsvRows = vi.fn().mockReturnValue(makeCsvGenerator())
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return { generateCsvRows: mockGenerateCsvRows }
      }
      return null
    })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
      query: { hasActivePolicy: 'true', search: 'joao' },
    })

    expect(mockGenerateCsvRows).toHaveBeenCalledWith(
      expect.objectContaining({ hasActivePolicy: true, search: 'joao' })
    )
  })

  it('passes personTypeIn to ExportClientsCsv', async () => {
    const mockGenerateCsvRows = vi.fn().mockReturnValue(makeCsvGenerator())
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return { generateCsvRows: mockGenerateCsvRows }
      }
      return null
    })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/clients/export',
      query: { personTypeIn: 'COMPANY' },
    })

    expect(mockGenerateCsvRows).toHaveBeenCalledWith(
      expect.objectContaining({ personTypeIn: ['COMPANY'] })
    )
  })
})
