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
import { exportCommissionsRoute } from '../export-commissions.js'

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(exportCommissionsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

async function* makeCsvGenerator(rows: string[] = []) {
  yield 'Vendedor,Apolice,Premio,Comissao,Status\n'
  for (const row of rows) {
    yield row
  }
}

describe('GET /api/v1/commissions/export', () => {
  it('returns 200 with text/csv content type', async () => {
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return { generateCsvRows: vi.fn().mockReturnValue(makeCsvGenerator()) }
      }
      return null
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions/export',
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
  })
  it('returns CSV attachment header with correct filename', async () => {
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return { generateCsvRows: vi.fn().mockReturnValue(makeCsvGenerator()) }
      }
      return null
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions/export',
    })
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="comissoes.csv"'
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
                'João Silva,POL-2026-001,10000.00,1500.00,APPROVED\n',
              ])
            ),
        }
      }
      return null
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/commissions/export',
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Vendedor')
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
      url: '/api/v1/commissions/export',
      query: { status: 'APPROVED', salespersonId: 'user-id-001' },
    })
    expect(mockGenerateCsvRows).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'APPROVED',
        salespersonId: 'user-id-001',
      })
    )
  })
})
