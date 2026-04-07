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
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { exportProposalsRoute } from '../export-proposals.js'

let app: Awaited<ReturnType<typeof createTestApp>>

async function* makeCsvGenerator(rows: string[] = []) {
  yield 'Proposta,Ramo,Estagio,Premio,Tipo\n'
  for (const row of rows) {
    yield row
  }
}

beforeAll(async () => {
  app = await createTestApp(exportProposalsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('GET /api/v1/proposals/export', () => {
  it('returns 200 with text/csv content type', async () => {
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return { generateCsvRows: vi.fn().mockReturnValue(makeCsvGenerator()) }
      }
      return null
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/export',
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
      url: '/api/v1/proposals/export',
    })

    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="propostas.csv"'
    )
  })

  it('streams CSV rows in response body', async () => {
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return {
          generateCsvRows: vi
            .fn()
            .mockReturnValue(
              makeCsvGenerator(['p-001,AUTO,QUOTE,1500.00,NEW_INSURANCE\n'])
            ),
        }
      }
      return null
    })

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/export',
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain('Proposta')
    expect(response.body).toContain('p-001')
  })

  it('passes filters to use case including organizationId', async () => {
    const mockGenerateCsvRows = vi.fn().mockReturnValue(makeCsvGenerator())
    vi.mocked(container.resolve).mockImplementation((token: unknown) => {
      if (typeof token === 'function') {
        return { generateCsvRows: mockGenerateCsvRows }
      }
      return null
    })

    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/proposals/export',
      query: { stage: 'QUOTE', boardType: 'NEW_INSURANCE' },
    })

    expect(mockGenerateCsvRows).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        stage: 'QUOTE',
        boardType: 'NEW_INSURANCE',
      })
    )
  })
})
