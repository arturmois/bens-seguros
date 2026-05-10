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
import { exportPoliciesRoute } from '../export-policies.js'

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(exportPoliciesRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

async function* makeCsvGenerator(rows: string[] = []) {
  yield 'Numero Apolice,CPF/CNPJ Cliente,Ramo,Premio,Status\n'
  for (const row of rows) {
    yield row
  }
}

describe('GET /api/v1/policies/export', () => {
  it('returns 200 with text/csv content type', async () => {
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return { generateCsvRows: vi.fn().mockReturnValue(makeCsvGenerator()) }
      }
      return null
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies/export',
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
      url: '/api/v1/policies/export',
    })
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="apolices.csv"'
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
                'POL-2026-001,12345678901,AUTO,1500.00,ACTIVE\n',
              ])
            ),
        }
      }
      return null
    })
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies/export',
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Numero Apolice')
    expect(response.body).toContain('POL-2026-001')
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
      url: '/api/v1/policies/export',
      query: { status: 'ACTIVE', branch: 'AUTO' },
    })
    expect(mockGenerateCsvRows).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', branch: 'AUTO' })
    )
  })
  it('propagates statusIn, branchIn, boardTypeIn to export use case', async () => {
    const mockGenerateCsvRows = vi.fn().mockReturnValue(makeCsvGenerator())
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return { generateCsvRows: mockGenerateCsvRows }
      }
      return null
    })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/policies/export?statusIn=ACTIVE,EXPIRED&branchIn=AUTO&boardTypeIn=RENEWAL',
    })
    expect(mockGenerateCsvRows).toHaveBeenCalledWith(
      expect.objectContaining({
        statusIn: ['ACTIVE', 'EXPIRED'],
        branchIn: ['AUTO'],
        boardTypeIn: ['RENEWAL'],
      })
    )
  })
})
