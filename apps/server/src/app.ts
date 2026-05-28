import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import type { AsaasBillingProvider } from '@repo/asaas-adapter'
import { createAsaasBillingProvider } from '@repo/asaas-adapter'
import { createAuth } from '@repo/auth'
import {
  ResendEmailProvider,
  emailVerificationEmail,
  passwordResetEmail,
} from '@repo/core/notification'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import { RATE_LIMITS } from '@repo/shared'
import { PINO_REDACT_CONFIG } from '@repo/shared/pino-redact'
import * as Sentry from '@sentry/node'
import type { FastifyError } from 'fastify'
import Fastify from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import IORedis from 'ioredis'
import crypto from 'node:crypto'
import 'reflect-metadata'
import { ZodError } from 'zod'
import { setupBullBoard } from './bull-board.js'
import { registerDependencies } from './container-registrations.js'
import { requireAbility } from './middlewares/ability-middleware.js'
import { createAuthMiddleware } from './middlewares/auth-middleware.js'
import { internalAuthMiddleware } from './middlewares/internal-auth-middleware.js'
import { createInternalRateLimitHook } from './middlewares/internal-rate-limit.js'
import { tenantMiddleware } from './middlewares/tenant-middleware.js'
import { applySecurityHeaders } from './plugins/security-headers.js'
import { registerAuthRoutes } from './routes/auth-routes.js'
import { internalContactRoutes } from './routes/internal/contacts/index.js'
import { internalLeadRoutes } from './routes/internal/leads/index.js'
import { termsRoutes } from './routes/terms/index.js'
import { adminAiUsageRoutes } from './routes/v1/admin/ai-usage/index.js'
import { assistanceRoutes } from './routes/v1/assistances/index.js'
import { auditLogRoutes } from './routes/v1/audit-logs/index.js'
import { createBillingRoutes } from './routes/v1/billing/index.js'
import { cepRoutes } from './routes/v1/cep/index.js'
import { chatTokenRoute } from './routes/v1/chat/index.js'
import { claimRoutes } from './routes/v1/claims/index.js'
import { clientRoutes } from './routes/v1/clients/index.js'
import { commissionRoutes } from './routes/v1/commissions/index.js'
import { contactRoutes } from './routes/v1/contacts/index.js'
import { documentRoutes } from './routes/v1/documents/index.js'
import { endorsementRoutes } from './routes/v1/endorsements/index.js'
import { goalRoutes } from './routes/v1/goals/index.js'
import { insurerRoutes } from './routes/v1/insurers/index.js'
import { invitationRoutes } from './routes/v1/invitations/index.js'
import { publicInvitationRoutes } from './routes/v1/invitations/public.js'
import { memberRoutes } from './routes/v1/members/index.js'
import { notificationRoutes } from './routes/v1/notifications/index.js'
import { createOnboardingRoutes } from './routes/v1/onboarding/index.js'
import { organizationRoutes } from './routes/v1/organization/index.js'
import { policyRoutes } from './routes/v1/policies/index.js'
import { proposalRoutes } from './routes/v1/proposals/index.js'
import { searchRoutes } from './routes/v1/search/index.js'
import { statsRoutes } from './routes/v1/stats/index.js'
import { tenantRoutes } from './routes/v1/tenants/index.js'
import { vehicleRoutes } from './routes/v1/vehicles/index.js'
import { asaasWebhookRoute } from './routes/webhooks/asaas/index.js'

export async function buildApp() {
  const redis = new IORedis(env.REDIS_URL)
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: PINO_REDACT_CONFIG,
    },
    bodyLimit: 10 * 1024 * 1024, // S6: 10MB
    trustProxy: true,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
  })
  app.decorate('redis', redis)
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
  await app.register(rateLimit, {
    max: RATE_LIMITS.GLOBAL.max,
    timeWindow: `${String(RATE_LIMITS.GLOBAL.windowSeconds)} seconds`,
    redis,
    nameSpace: 'rl:',
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Try again in ${String(Math.ceil(context.ttl / 1000))} seconds.`,
        retryAfter: Math.ceil(context.ttl / 1000),
      },
    }),
  })
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Bens Seguros API',
        version: '1.0.0',
      },
    },
    transform({ schema, url, ...rest }) {
      const transformed = jsonSchemaTransform({ schema, url, ...rest })
      if (!transformed.schema?.tags?.length) {
        const match = /^\/api\/v1\/([^/]+)/.exec(url)
        if (match) {
          const segment = match[1] ?? ''
          const tag = segment
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
          transformed.schema = { ...transformed.schema, tags: [tag] }
        }
      }
      return transformed
    },
  })
  await app.register(import('@scalar/fastify-api-reference'), {
    routePrefix: '/api/docs',
  })
  const SCALAR_CSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net",
    "img-src 'self' data: cdn.jsdelivr.net",
    "font-src 'self' cdn.jsdelivr.net fonts.scalar.com",
    "connect-src 'self' proxy.scalar.com",
    "worker-src 'self' blob:",
  ].join('; ')
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/api/docs')) {
      void reply.header('content-security-policy', SCALAR_CSP)
    }
    return payload
  })
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })
  registerDependencies(redis)
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/api/')) {
      void reply.header(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, max-age=0'
      )
      void reply.header('Pragma', 'no-cache')
    }
    return payload
  })
  applySecurityHeaders(app)
  app.get('/health', async (_request, reply) => {
    const errors: string[] = []
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      errors.push('PostgreSQL unreachable')
    }
    try {
      await redis.ping()
    } catch {
      errors.push('Redis unreachable')
    }
    if (errors.length > 0) {
      return reply.status(503).send({ status: 'degraded', errors })
    }
    return { status: 'ok' }
  })
  if (env.STORAGE_PROVIDER !== 'r2') {
    const { createReadStream, existsSync } = await import('node:fs')
    const { resolve, extname, sep } = await import('node:path')
    const uploadsDir = resolve('./uploads')
    const safeBase = uploadsDir + sep
    const MIME_MAP: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    }
    app.get<{ Params: { '*': string } }>(
      '/uploads/*',
      async (request, reply) => {
        const resolved = resolve(uploadsDir, request.params['*'])
        if (!resolved.startsWith(safeBase)) {
          return reply.status(403).send({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Acesso não permitido' },
          })
        }
        if (!existsSync(resolved)) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'FILE_NOT_FOUND',
              message: 'Arquivo não encontrado',
            },
          })
        }
        const ext = extname(resolved)
        const contentType = MIME_MAP[ext] ?? 'application/octet-stream'
        void reply.header('Content-Type', contentType)
        return reply.send(createReadStream(resolved))
      }
    )
  }
  const frontendUrl = env.FRONTEND_URL
  const cookieDomain = env.COOKIE_DOMAIN
  const resendApiKey = env.RESEND_API_KEY
  const emailProvider = resendApiKey
    ? new ResendEmailProvider({
        apiKey: resendApiKey,
        fromAddress: env.RESEND_FROM_ADDRESS,
      })
    : null
  const auth = createAuth(
    env.AUTH_SECRET,
    env.API_URL,
    [frontendUrl],
    cookieDomain,
    emailProvider
      ? {
          frontendUrl,
          sendVerificationEmail: (email, name, url) => {
            void emailProvider
              .send({
                to: email,
                subject: 'Verifique seu email — Bens Seguros',
                html: emailVerificationEmail({ name, url }),
              })
              .catch((err: unknown) => {
                app.log.error(
                  { err, email },
                  'Failed to send verification email'
                )
              })
          },
          sendResetPasswordEmail: (email, name, url) => {
            void emailProvider
              .send({
                to: email,
                subject: 'Redefinir senha — Bens Seguros',
                html: passwordResetEmail({ name, url }),
              })
              .catch((err: unknown) => {
                app.log.error(
                  { err, email },
                  'Failed to send password reset email'
                )
              })
          },
        }
      : undefined
  )
  app.setErrorHandler((error: FastifyError, request, reply) => {
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
      const firstIssue = error.issues[0]
      const field = firstIssue?.path.join('.') ?? 'input'
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Validação falhou no campo '${field}': ${firstIssue?.message ?? 'valor inválido'}`,
        },
      })
    }
    if (env.SENTRY_DSN) {
      Sentry.captureException(error, {
        extra: { url: request.url, method: request.method },
      })
    }
    request.log.error(error)
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
  let asaasProvider: AsaasBillingProvider | null = null
  try {
    asaasProvider = createAsaasBillingProvider()
    app.log.info('Asaas billing provider initialized')
  } catch (err) {
    app.log.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'Asaas billing provider NOT initialized — webhook route will return 503'
    )
  }

  registerAuthRoutes(app, auth, redis)
  await app.register(async (publicApp) => {
    publicInvitationRoutes(publicApp, auth)
  })
  await app.register(async (webhooksApp) => {
    asaasWebhookRoute(webhooksApp, asaasProvider, redis)
  })
  const authMiddleware = createAuthMiddleware(auth)
  await app.register(async (authenticatedApp) => {
    authenticatedApp.addHook('preHandler', authMiddleware)
    await authenticatedApp.register(tenantRoutes)
    await authenticatedApp.register(clientRoutes)
    await authenticatedApp.register(contactRoutes)
    await authenticatedApp.register(proposalRoutes)
    await authenticatedApp.register(policyRoutes)
    await authenticatedApp.register(claimRoutes)
    await authenticatedApp.register(endorsementRoutes)
    await authenticatedApp.register(assistanceRoutes)
    await authenticatedApp.register(documentRoutes)
    await authenticatedApp.register(insurerRoutes)
    await authenticatedApp.register(memberRoutes)
    await authenticatedApp.register(invitationRoutes)
    await authenticatedApp.register(organizationRoutes)
    await authenticatedApp.register(commissionRoutes)
    await authenticatedApp.register(goalRoutes)
    await authenticatedApp.register(chatTokenRoute)
    await authenticatedApp.register(statsRoutes)
    await authenticatedApp.register(auditLogRoutes)
    await authenticatedApp.register(adminAiUsageRoutes)
    await authenticatedApp.register(notificationRoutes)
    await authenticatedApp.register(searchRoutes)
    await authenticatedApp.register(cepRoutes)
    await authenticatedApp.register(vehicleRoutes)
    await authenticatedApp.register(termsRoutes)
    await authenticatedApp.register(createBillingRoutes(redis, asaasProvider))
    await authenticatedApp.register(createOnboardingRoutes(auth))
  })
  await app.register(async (internalApp) => {
    internalApp.addHook('preHandler', internalAuthMiddleware)
    internalApp.addHook('preHandler', createInternalRateLimitHook(redis))
    await internalApp.register(internalLeadRoutes)
    await internalApp.register(internalContactRoutes)
  })
  await app.register(async (adminApp) => {
    adminApp.addHook('preHandler', authMiddleware)
    adminApp.addHook('preHandler', tenantMiddleware)
    adminApp.addHook('preHandler', requireAbility('manage', 'all'))
    setupBullBoard(adminApp)
  })
  return app
}
