import type { Auth } from '@repo/auth'
import type { FastifyInstance } from 'fastify'
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
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'

const findUniquePlanMock = vi.fn()
const createSubscriptionMock = vi.fn()

vi.mock('@repo/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/db')>()
  return {
    ...actual,
    prismaAdmin: {
      get plan() {
        return { findUnique: findUniquePlanMock }
      },
      get subscription() {
        return { create: createSubscriptionMock }
      },
    },
  }
})

const { completeOnboardingRoute } = await import('../complete.js')

const mockAuth = {
  api: {
    createOrganization: vi.fn(),
  },
}

function registerRoute(app: FastifyInstance) {
  return completeOnboardingRoute(app, mockAuth as unknown as Auth)
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(registerRoute)
})

afterAll(() => app.close())

beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockAuth.api.createOrganization.mockResolvedValue({
    id: 'org-new-1',
    name: 'Corretora Teste',
    slug: 'corretora-teste-abc123',
  })
  findUniquePlanMock.mockResolvedValue({
    id: 'plan-starter-1',
    slug: 'starter',
    active: true,
  })
  createSubscriptionMock.mockResolvedValue({ id: 'sub-new-1' })
})

describe('POST /api/v1/onboarding/complete', () => {
  it('200 happy: cria org + subscription e retorna IDs + redirectTo', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/onboarding/complete',
      payload: { orgName: 'Corretora Teste', planSlug: 'starter' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toMatchObject({
      organizationId: 'org-new-1',
      subscriptionId: 'sub-new-1',
      redirectTo: '/dashboard',
    })

    expect(mockAuth.api.createOrganization).toHaveBeenCalledTimes(1)
    const orgCall = mockAuth.api.createOrganization.mock.calls[0]?.[0] as {
      body: { name: string; slug: string; userId: string }
    }
    expect(orgCall.body.name).toBe('Corretora Teste')
    expect(orgCall.body.userId).toBe(TEST_USER_ID)
    expect(orgCall.body.slug).toMatch(/^corretora-teste-[0-9a-f]{6}$/)

    expect(findUniquePlanMock).toHaveBeenCalledWith({
      where: { slug: 'starter' },
      select: { id: true, slug: true, active: true },
    })
    expect(createSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-new-1',
          planId: 'plan-starter-1',
          status: 'TRIALING',
        }),
        select: { id: true },
      })
    )
  })

  it('401 quando user nao esta autenticado', async () => {
    setTestContext({ user: null })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/onboarding/complete',
      payload: { orgName: 'Corretora Teste', planSlug: 'starter' },
    })
    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe('UNAUTHORIZED')
  })

  it('400 quando orgName vazio', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/onboarding/complete',
      payload: { orgName: '', planSlug: 'starter' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('400 quando planSlug ausente', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/onboarding/complete',
      payload: { orgName: 'Corretora Teste' },
    })
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('404 PLAN_NOT_FOUND quando plano nao existe', async () => {
    findUniquePlanMock.mockResolvedValue(null)
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/onboarding/complete',
      payload: { orgName: 'Corretora Teste', planSlug: 'inexistente' },
    })
    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PLAN_NOT_FOUND')
    expect(body.error.message).toContain('inexistente')
    expect(mockAuth.api.createOrganization).not.toHaveBeenCalled()
    expect(createSubscriptionMock).not.toHaveBeenCalled()
  })

  it('404 PLAN_NOT_FOUND quando plano inativo (active=false)', async () => {
    findUniquePlanMock.mockResolvedValue({
      id: 'plan-x',
      slug: 'legacy',
      active: false,
    })
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/onboarding/complete',
      payload: { orgName: 'Corretora Teste', planSlug: 'legacy' },
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('PLAN_NOT_FOUND')
    expect(mockAuth.api.createOrganization).not.toHaveBeenCalled()
  })

  it('propaga erro do Better Auth (slug conflict) como 500', async () => {
    mockAuth.api.createOrganization.mockRejectedValue(
      new Error('Organization with slug already exists')
    )
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/onboarding/complete',
      payload: { orgName: 'Corretora Teste', planSlug: 'starter' },
    })
    expect(response.statusCode).toBe(500)
    expect(createSubscriptionMock).not.toHaveBeenCalled()
  })
})
