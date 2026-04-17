import Fastify, { type FastifyInstance } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { ZodError } from 'zod'

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
  organizationId: string | null
  user: typeof TEST_USER | null
  session: { activeOrganizationId: string }
  role: string | null
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

  // Mirror production error handler so validation errors match the
  // { success: false, error: { code, message } } envelope declared in route
  // response schemas.
  app.setErrorHandler((error, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const first = error.validation[0]
      const path = first?.instancePath ?? 'input'
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Validação falhou no campo '${path}': ${first?.message ?? 'valor inválido'}`,
        },
      })
    }
    if (error instanceof ZodError) {
      const first = error.issues[0]
      const field = first?.path.join('.') ?? 'input'
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Validação falhou no campo '${field}': ${first?.message ?? 'valor inválido'}`,
        },
      })
    }
    const statusCode = error.statusCode ?? 500
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message:
          statusCode === 500 ? 'Erro interno do servidor' : error.message,
      },
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
