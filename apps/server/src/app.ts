import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import { createAuth } from '@repo/auth'
import { env } from '@repo/env'
import { RATE_LIMITS } from '@repo/shared'
import { PINO_REDACT_CONFIG } from '@repo/shared/pino-redact'
import * as Sentry from '@sentry/node'
import IORedis from 'ioredis'
import type { FastifyError, FastifyRequest } from 'fastify'
import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import 'reflect-metadata'
import { ZodError } from 'zod'
import { setupBullBoard } from './bull-board.js'
import { registerDependencies } from './container-registrations.js'
import { requireAbility } from './middlewares/ability-middleware.js'
import { createAuthMiddleware } from './middlewares/auth-middleware.js'
import { tenantMiddleware } from './middlewares/tenant-middleware.js'
import { registerAuthRoutes } from './routes/auth-routes.js'
import { assistanceRoutes } from './routes/v1/assistance-routes.js'
import { auditLogRoutes } from './routes/v1/audit-log-routes.js'
import { chatTokenRoute } from './routes/v1/chat-token-route.js'
import { claimRoutes } from './routes/v1/claim-routes.js'
import { clientRoutes } from './routes/v1/client-routes.js'
import { commissionRoutes } from './routes/v1/commission-routes.js'
import { documentRoutes } from './routes/v1/document-routes.js'
import { endorsementRoutes } from './routes/v1/endorsement-routes.js'
import { insurerRoutes } from './routes/v1/insurer-routes.js'
import { invitationRoutes } from './routes/v1/invitation-routes.js'
import { memberRoutes } from './routes/v1/member-routes.js'
import { organizationRoutes } from './routes/v1/organization-routes.js'
import { notificationRoutes } from './routes/v1/notification-routes.js'
import { policyRoutes } from './routes/v1/policy-routes.js'
import { proposalRoutes } from './routes/v1/proposal-routes.js'
import { searchRoutes } from './routes/v1/search-routes.js'
import { statsRoutes } from './routes/v1/stats-routes.js'
import { internalLeadRoutes } from './routes/internal/lead-routes.js'
import { tenantRoutes } from './routes/v1/tenant-routes.js'

export async function buildApp() {
  const redis = new IORedis(env.REDIS_URL)

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: PINO_REDACT_CONFIG,
    },
    bodyLimit: 10 * 1024 * 1024, // S6: 10MB
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  await app.register(helmet)

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
  })

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

  registerDependencies(redis)

  // Prevent caching on all API responses to avoid stale data in browsers
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

  app.get('/health', async () => ({ status: 'ok' }))

  // Serve local uploads in dev (production uses R2 presigned URLs)
  if (env.STORAGE_PROVIDER !== 'r2') {
    const { createReadStream, existsSync } = await import('node:fs')
    const { resolve, join, extname } = await import('node:path')
    const uploadsDir = resolve('./uploads')

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
        const filePath = join(uploadsDir, request.params['*'])
        if (!existsSync(filePath)) {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'FILE_NOT_FOUND',
              message: 'Arquivo nao encontrado',
            },
          })
        }
        const ext = extname(filePath)
        const contentType = MIME_MAP[ext] ?? 'application/octet-stream'
        void reply.header('Content-Type', contentType)
        return reply.send(createReadStream(filePath))
      }
    )
  }

  // Better Auth integration
  const frontendUrl = env.FRONTEND_URL
  const cookieDomain = env.COOKIE_DOMAIN
  const auth = createAuth(
    env.AUTH_SECRET,
    env.API_URL,
    [frontendUrl],
    cookieDomain
  )
  registerAuthRoutes(app, auth, redis)

  // API v1 routes (authenticated)
  const authMiddleware = createAuthMiddleware(auth)
  await app.register(async (authenticatedApp) => {
    authenticatedApp.addHook('preHandler', authMiddleware)
    await authenticatedApp.register(tenantRoutes)
    await authenticatedApp.register(clientRoutes)
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
    await authenticatedApp.register(chatTokenRoute)
    await authenticatedApp.register(statsRoutes)
    await authenticatedApp.register(auditLogRoutes)
    await authenticatedApp.register(notificationRoutes)
    await authenticatedApp.register(searchRoutes)
  })

  // Internal API routes (HMAC-authenticated, no session required)
  await app.register(async (internalApp) => {
    await internalApp.register(rateLimit, {
      max: RATE_LIMITS.INTERNAL.max,
      timeWindow: `${String(RATE_LIMITS.INTERNAL.windowSeconds)} seconds`,
      redis,
      nameSpace: 'rl:internal:',
      keyGenerator: (request: FastifyRequest) => request.ip,
      errorResponseBuilder: (
        _request: FastifyRequest,
        context: { ttl: number }
      ) => ({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Try again in ${String(Math.ceil(context.ttl / 1000))} seconds.`,
          retryAfter: Math.ceil(context.ttl / 1000),
        },
      }),
    })
    await internalApp.register(internalLeadRoutes)
  })

  // Bull Board (owner-only, inside authenticated + tenant scope)
  await app.register(async (adminApp) => {
    adminApp.addHook('preHandler', authMiddleware)
    adminApp.addHook('preHandler', tenantMiddleware)
    adminApp.addHook('preHandler', requireAbility('manage', 'all'))
    setupBullBoard(adminApp)
  })

  // Sentry error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
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

  return app
}
