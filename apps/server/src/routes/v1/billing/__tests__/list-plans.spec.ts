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
} from '../../../../__tests__/helpers/create-test-app.js'

const findManyPlansMock = vi.fn()

vi.mock('@repo/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/db')>()
  return {
    ...actual,
    prismaAdmin: {
      get plan() {
        return { findMany: findManyPlansMock }
      },
    },
  }
})

const { listPublicPlansRoute } = await import('../list-plans.js')

let app: Awaited<ReturnType<typeof createTestApp>>

function makePlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'plan-starter',
    slug: 'starter',
    name: 'Starter',
    description: 'Para corretoras iniciando',
    priceCents: 4990,
    currency: 'BRL',
    billingPeriod: 'MONTHLY' as const,
    sortOrder: 1,
    maxUsers: 3,
    maxProposalsPerMonth: 50,
    maxChannels: 1,
    maxConversationsPerOrg: 200,
    maxImportRows: 100,
    maxLogoSizeBytes: 524288,
    aiEnabled: false,
    aiMessagesIncluded: 0,
    aiOverageCentsPerMessage: 0,
    features: { customBranding: false, apiAccess: false },
    ...overrides,
  }
}

beforeAll(async () => {
  app = await createTestApp((appInstance) => listPublicPlansRoute(appInstance))
})

afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/billing/plans (público)', () => {
  it('200 retorna lista vazia quando não há planos', async () => {
    findManyPlansMock.mockResolvedValue([])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/plans',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  it('200 retorna planos ordenados por sortOrder + priceCents', async () => {
    findManyPlansMock.mockResolvedValue([
      makePlanRow({ id: 'p1', slug: 'free', sortOrder: 0, priceCents: 0 }),
      makePlanRow({
        id: 'p2',
        slug: 'starter',
        sortOrder: 1,
        priceCents: 4990,
      }),
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/plans',
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].slug).toBe('free')
    expect(body.data[1].slug).toBe('starter')
  })

  it('filtra por active=true AND isPublic=true no DB query', async () => {
    findManyPlansMock.mockResolvedValue([])
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/plans',
    })
    expect(findManyPlansMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true, isPublic: true },
        orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }],
      })
    )
  })

  it('serializa todos os campos do payload corretamente', async () => {
    findManyPlansMock.mockResolvedValue([makePlanRow()])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/plans',
    })
    const plan = response.json().data[0]
    expect(plan).toMatchObject({
      id: 'plan-starter',
      slug: 'starter',
      name: 'Starter',
      description: 'Para corretoras iniciando',
      priceCents: 4990,
      currency: 'BRL',
      billingPeriod: 'MONTHLY',
      sortOrder: 1,
      maxUsers: 3,
      aiEnabled: false,
      features: { customBranding: false, apiAccess: false },
    })
  })

  it('description null não quebra serialização', async () => {
    findManyPlansMock.mockResolvedValue([makePlanRow({ description: null })])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/plans',
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data[0].description).toBeNull()
  })

  it('features inválido (null) vira objeto vazio', async () => {
    findManyPlansMock.mockResolvedValue([makePlanRow({ features: null })])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/plans',
    })
    expect(response.statusCode).toBe(200)
    expect(response.json().data[0].features).toEqual({})
  })

  it('quotas nullable (unlimited) preservadas como null', async () => {
    findManyPlansMock.mockResolvedValue([
      makePlanRow({
        maxUsers: null,
        maxProposalsPerMonth: null,
        maxChannels: null,
      }),
    ])
    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/billing/plans',
    })
    const plan = response.json().data[0]
    expect(plan.maxUsers).toBeNull()
    expect(plan.maxProposalsPerMonth).toBeNull()
    expect(plan.maxChannels).toBeNull()
  })
})
