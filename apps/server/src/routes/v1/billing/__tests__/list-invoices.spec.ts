import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  createTestApp,
  injectAs,
  setTestContext,
} from '../../../../__tests__/helpers/create-test-app.js'

const findManyMock = vi.fn()

vi.mock('@repo/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/db')>()
  return {
    ...actual,
    prismaAdmin: {
      get invoice() {
        return { findMany: findManyMock }
      },
    },
  }
})

const { listBillingInvoicesRoute } = await import('../list-invoices.js')

let app: Awaited<ReturnType<typeof createTestApp>>

function makeInvoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv_1',
    status: 'PAID' as const,
    amountCents: 1990,
    baseAmountCents: 1990,
    overageAmountCents: 0,
    dueDate: new Date('2026-05-01T00:00:00Z'),
    paidAt: new Date('2026-04-30T10:00:00Z'),
    periodStart: new Date('2026-04-01T00:00:00Z'),
    periodEnd: new Date('2026-04-30T23:59:59Z'),
    paymentMethod: 'PIX' as const,
    invoiceUrl: null,
    receiptUrl: 'https://r.com/r/1',
    createdAt: new Date('2026-04-30T10:00:01Z'),
    ...overrides,
  }
}

beforeAll(async () => {
  app = await createTestApp((appInstance) =>
    listBillingInvoicesRoute(appInstance)
  )
})

afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('GET /api/v1/billing/invoices', () => {
  it('returns 200 with empty list when no invoices exist', async () => {
    findManyMock.mockResolvedValue([])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/invoices',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
    expect(body.meta.nextCursor).toBeNull()
  })

  it('returns invoices with ISO serialized dates', async () => {
    findManyMock.mockResolvedValue([makeInvoiceRow()])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/invoices',
    })
    const body = response.json()
    expect(body.data[0].id).toBe('inv_1')
    expect(body.data[0].status).toBe('PAID')
    expect(body.data[0].dueDate).toBe('2026-05-01T00:00:00.000Z')
    expect(body.data[0].paidAt).toBe('2026-04-30T10:00:00.000Z')
    expect(body.data[0].paymentMethod).toBe('PIX')
  })

  it('filters by organizationId from request context', async () => {
    findManyMock.mockResolvedValue([])
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/invoices',
    })
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-test-00000000-0000-0000-0000-000000000001',
        },
      })
    )
  })

  it('honors cursor + limit query params', async () => {
    findManyMock.mockResolvedValue([])
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/invoices?cursor=inv_5&limit=10',
    })
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 11,
        cursor: { id: 'inv_5' },
        skip: 1,
      })
    )
  })

  it('returns nextCursor when more rows exist than limit', async () => {
    const rows = Array.from({ length: 21 }, (_, i) =>
      makeInvoiceRow({ id: `inv_${i + 1}` })
    )
    findManyMock.mockResolvedValue(rows)
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/invoices?limit=20',
    })
    const body = response.json()
    expect(body.data).toHaveLength(20)
    expect(body.meta.nextCursor).toBe('inv_20')
  })

  it('returns null nextCursor when rows count equals limit', async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeInvoiceRow({ id: `inv_${i + 1}` })
    )
    findManyMock.mockResolvedValue(rows)
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/invoices?limit=20',
    })
    const body = response.json()
    expect(body.data).toHaveLength(5)
    expect(body.meta.nextCursor).toBeNull()
  })
})
