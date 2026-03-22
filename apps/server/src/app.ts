import 'reflect-metadata'
import * as Sentry from '@sentry/node'
import Fastify from 'fastify'
import type { FastifyError } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { createAuth } from '@repo/auth'
import { env } from '@repo/env'
import { registerAuthRoutes } from './routes/auth-routes.js'
import { tenantRoutes } from './routes/v1/tenant-routes.js'
import { clientRoutes } from './routes/v1/client-routes.js'
import { proposalRoutes } from './routes/v1/proposal-routes.js'
import { policyRoutes } from './routes/v1/policy-routes.js'
import { claimRoutes } from './routes/v1/claim-routes.js'
import { endorsementRoutes } from './routes/v1/endorsement-routes.js'
import { assistanceRoutes } from './routes/v1/assistance-routes.js'
import { documentRoutes } from './routes/v1/document-routes.js'
import { insurerRoutes } from './routes/v1/insurer-routes.js'
import { commissionRoutes } from './routes/v1/commission-routes.js'
import { chatTokenRoute } from './routes/v1/chat-token-route.js'
import { statsRoutes } from './routes/v1/stats-routes.js'
import { auditLogRoutes } from './routes/v1/audit-log-routes.js'
import { createAuthMiddleware } from './middlewares/auth-middleware.js'
import { registerDependencies } from './container-registrations.js'
import { setupBullBoard } from './bull-board.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    bodyLimit: 10 * 1024 * 1024, // S6: 10MB
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  await app.register(helmet)

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
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

  registerDependencies()

  app.get('/health', async () => ({ status: 'ok' }))

  // Better Auth integration
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  const auth = createAuth(env.AUTH_SECRET, env.API_URL, [frontendUrl])
  registerAuthRoutes(app, auth)

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
    await authenticatedApp.register(commissionRoutes)
    await authenticatedApp.register(chatTokenRoute)
    await authenticatedApp.register(statsRoutes)
    await authenticatedApp.register(auditLogRoutes)
  })

  // Bull Board (admin-only, inside authenticated scope)
  await app.register(async (adminApp) => {
    adminApp.addHook('preHandler', authMiddleware)
    setupBullBoard(adminApp)
  })

  // Sentry error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (process.env.SENTRY_DSN) {
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
