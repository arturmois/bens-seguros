import type { Auth } from '@repo/auth'
import { container, PlanNotFoundError } from '@repo/core'
import type {
  CreateOrgWithTrialCallDeps,
  CreateOrgWithTrialInput,
} from '@repo/core'
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

const { completeOnboardingRoute } = await import('../complete.js')

const mockAuth = {
  api: {
    createOrganization: vi.fn(),
  },
}

// Fake CreateOrgWithTrial.execute that honors the route-provided callDeps so the
// route's wiring (auth.api.createOrganization + slugify) is still exercised. The
// repo-backed parts (plan lookup, subscription persistence) are simulated here —
// their logic is covered by @repo/core create-org-with-trial.spec.ts.
let planExists = true

function fakeExecute(
  input: CreateOrgWithTrialInput,
  deps: CreateOrgWithTrialCallDeps
) {
  if (!planExists) {
    throw new PlanNotFoundError(input.planSlug)
  }
  return (async () => {
    const org = await deps.createOrganization({
      name: input.orgName,
      ownerUserId: input.ownerUserId,
    })
    return {
      organizationId: org.id,
      subscriptionId: 'sub-new-1',
      trialEndsAt: new Date('2026-06-10T12:00:00.000Z'),
    }
  })()
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
  planExists = true
  mockAuth.api.createOrganization.mockResolvedValue({
    id: 'org-new-1',
    name: 'Corretora Teste',
    slug: 'corretora-teste-abc123',
  })
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') {
      return { execute: vi.fn(fakeExecute) }
    }
    return null
  })
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
  })

  it('encaminha o cookie da requisição para createOrganization', async () => {
    const response = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/onboarding/complete',
      payload: { orgName: 'Corretora Teste', planSlug: 'starter' },
      headers: { cookie: 'better-auth.session_token=tok-123' },
    })
    expect(response.statusCode).toBe(200)
    const call: unknown = mockAuth.api.createOrganization.mock.calls[0]?.[0]
    const headers =
      call && typeof call === 'object' && 'headers' in call
        ? call.headers
        : undefined
    expect(headers).toBeInstanceOf(Headers)
    expect(headers instanceof Headers ? headers.get('cookie') : null).toBe(
      'better-auth.session_token=tok-123'
    )
  })

  it('401 quando user não está autenticado', async () => {
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

  it('404 PLAN_NOT_FOUND quando plano não existe', async () => {
    planExists = false
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
  })

  it('404 PLAN_NOT_FOUND quando plano inativo (active=false)', async () => {
    // Repo trata plano inativo como inexistente (findPlanBySlug retorna null) →
    // PlanNotFoundError, igual ao caso acima.
    planExists = false
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
  })
})
