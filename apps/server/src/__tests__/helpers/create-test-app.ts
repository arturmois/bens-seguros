import Fastify, { type FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'

export const TEST_ORG_ID = 'org-test-00000000-0000-0000-0000-000000000001'
export const TEST_USER_ID = 'user-test-00000000-0000-0000-0000-000000000001'
export const TEST_USER = {
  id: TEST_USER_ID,
  email: 'test@user.com',
  name: 'Test User',
  emailVerified: true,
  image: null,
  isSuperAdmin: false,
}

interface TestContext {
  organizationId: string
  user: typeof TEST_USER
  session: { activeOrganizationId: string }
  role: string
  tenantPrisma: unknown
}

const DEFAULT_CONTEXT: TestContext = {
  organizationId: TEST_ORG_ID,
  user: TEST_USER,
  session: { activeOrganizationId: TEST_ORG_ID },
  role: 'OWNER',
  tenantPrisma: {},
}

let _testContext: TestContext = { ...DEFAULT_CONTEXT }

export function setTestContext(overrides: Partial<TestContext> = {}) {
  _testContext = { ...DEFAULT_CONTEXT, ...overrides }
}

export async function createTestApp(
  registerRoutes: (app: FastifyInstance) => void | Promise<void>
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.decorateRequest('user', null)
  app.decorateRequest('session', null)
  app.decorateRequest('organizationId', null)
  app.decorateRequest('role', null)
  app.decorateRequest('tenantPrisma', null)

  app.addHook('onRequest', async (request) => {
    Object.assign(request, {
      user: _testContext.user,
      session: _testContext.session,
      organizationId: _testContext.organizationId,
      role: _testContext.role,
      tenantPrisma: _testContext.tenantPrisma,
    })
  })

  await registerRoutes(app)
  await app.ready()
  return app
}

export function injectAs(
  app: FastifyInstance,
  opts: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    url: string
    payload?: unknown
    query?: Record<string, string>
    headers?: Record<string, string>
  }
) {
  return app.inject({
    method: opts.method,
    url: opts.url,
    payload: opts.payload,
    query: opts.query,
    headers: {
      'content-type': 'application/json',
      ...opts.headers,
    },
  })
}
