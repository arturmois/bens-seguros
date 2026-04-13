import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import fastifyStatic from '@fastify/static'
import { env } from '@repo/env'
import * as Sentry from '@sentry/node'
import { createAdapter } from '@socket.io/redis-adapter'
import crypto from 'node:crypto'
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import type IORedis from 'ioredis'
import mongoose from 'mongoose'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import { ZodError } from 'zod'

import { chatAuthMiddleware } from './infra/http/middleware/chat-auth-middleware.js'
import { aiAgentRoutes } from './infra/http/routes/ai-agent-routes.js'
import { channelRoutes } from './infra/http/routes/channel-routes.js'
import { conversationRoutes } from './infra/http/routes/conversation-routes.js'
import {
  metaCallbackRoute,
  metaRoutes,
} from './infra/http/routes/meta-routes.js'
import { webhookRoutes } from './infra/http/routes/webhook-routes.js'
import { rateLimitHook } from './infra/http/routes/widget-helpers.js'
import { widgetRoutes } from './infra/http/routes/widget-routes.js'
import { PINO_REDACT_CONFIG } from './infra/logger.js'
import type { PresenceTracker } from './infra/socket/presence-tracker.js'
import { createSocketAuthMiddleware } from './infra/socket/socket-auth.js'
import { setupSocketHandlers } from './infra/socket/socket-handler.js'
import { setupWidgetNamespace } from './infra/socket/widget-namespace.js'

const UNAUTHENTICATED_PATHS = new Set([
  '/health',
  '/chat/webhook/meta',
  '/meta/auth/callback',
])
const WIDGET_PATH_PREFIX = '/widget/'
const WIDGET_APP_PREFIX = '/widget-app/'

interface BuildChatAppOptions {
  readonly redisPub: IORedis
  readonly redisSub: IORedis
  readonly redisGeneral: IORedis
  readonly redisWidgetSub: IORedis
}

interface ChatAppResult {
  readonly app: FastifyInstance
  readonly io: Server
  readonly presence: PresenceTracker
}

export async function buildChatApp(
  options: BuildChatAppOptions
): Promise<ChatAppResult> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: PINO_REDACT_CONFIG,
    },
    trustProxy: true,
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  const allowedOrigins = new Set([env.FRONTEND_URL])

  // Use per-request CORS delegate so we can inspect the URL.
  // Widget routes accept any origin (validated per-channel in the route handler).
  // All other routes are restricted to configured origins.
  await app.register(
    cors,
    (_instance: FastifyInstance) =>
      (
        request: FastifyRequest,
        callback: (
          error: Error | null,
          corsOptions?: {
            origin: boolean | string[]
            credentials: boolean
            methods: string[]
          }
        ) => void
      ) => {
        const isWidgetRoute =
          request.url.startsWith(WIDGET_PATH_PREFIX) ||
          request.url.startsWith(WIDGET_APP_PREFIX)
        const origin = isWidgetRoute ? true : [...allowedOrigins]
        callback(null, {
          origin,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        })
      }
  )

  await app.register(helmet, {
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })

  // Widget routes need permissive CORS (origin validated per-channel in route handler)
  app.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?').at(0) ?? ''
    if (!path.startsWith(WIDGET_PATH_PREFIX)) return

    const requestOrigin = request.headers.origin
    if (requestOrigin) {
      void reply.header('access-control-allow-origin', requestOrigin)
      void reply.header('vary', 'Origin')
    }

    if (request.method === 'OPTIONS') {
      void reply.header('access-control-allow-methods', 'GET, POST, OPTIONS')
      void reply.header(
        'access-control-allow-headers',
        'Content-Type, Authorization'
      )
      void reply.header('access-control-max-age', '86400')
      await reply.status(204).send()
    }
  })

  // Socket.IO CORS: Socket.IO does not support per-namespace CORS configuration.
  // The /widget namespace must accept connections from any origin because embeddable
  // widgets are loaded on third-party domains. Security for widget connections is
  // enforced via JWT auth (visitorToken) on each socket connection, not via CORS.
  // The main namespace also validates auth via createSocketAuthMiddleware.
  const io = new Server(app.server, {
    cors: {
      origin: (origin, callback) => {
        // Allow same-origin and configured origins
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true)
          return
        }
        // Allow all other origins because the /widget namespace serves embeddable
        // widgets on arbitrary customer domains. Auth is enforced per-socket via JWT.
        callback(null, true)
      },
      credentials: true,
    },
    adapter: createAdapter(options.redisPub, options.redisSub),
  })

  app.decorate('io', io)
  app.decorate('redisPub', options.redisPub)
  app.decorate('redisGeneral', options.redisGeneral)

  // Health check (no auth)
  app.get('/health', async (_request, reply) => {
    const errors: string[] = []

    if (mongoose.connection.readyState !== 1) {
      errors.push('MongoDB unreachable')
    }

    try {
      await options.redisPub.ping()
    } catch {
      errors.push('Redis unreachable')
    }

    if (errors.length > 0) {
      return reply.status(503).send({ status: 'degraded', errors })
    }

    return { status: 'ok' }
  })

  // Widget static assets — SPA served at /widget-app/, embed.js at /widget/embed.js
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const widgetDistPath =
    env.WIDGET_DIST_PATH ?? path.resolve(currentDir, '../../widget/dist')

  const widgetDistExists = existsSync(widgetDistPath)
  if (widgetDistExists) {
    await app.register(fastifyStatic, {
      root: widgetDistPath,
      prefix: WIDGET_APP_PREFIX,
      decorateReply: false,
      maxAge: 31_536_000_000,
      immutable: true,
    })

    const embedJsPath = path.join(widgetDistPath, 'embed.js')
    const embedJsContent = existsSync(embedJsPath)
      ? readFileSync(embedJsPath, 'utf-8')
      : null

    if (embedJsContent) {
      app.get('/widget/embed.js', async (request, reply) => {
        await rateLimitHook(request, reply)
        return reply
          .type('application/javascript')
          .header('Cache-Control', 'no-cache')
          .send(embedJsContent)
      })
    }
  } else {
    app.log.warn(
      { widgetDistPath },
      'Widget dist not found — static serving disabled. Run: pnpm turbo build --filter=@app/widget'
    )
  }

  // Unauthenticated routes (Meta webhook + OAuth callback)
  await app.register(webhookRoutes)
  await app.register(metaCallbackRoute)

  // Widget routes (own auth via visitorToken, registered before chatAuthMiddleware)
  await app.register(widgetRoutes, { prefix: '/widget' })

  // Auth middleware for authenticated routes (skip widget + webhook + health)
  app.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const path = request.url.split('?').at(0) ?? ''
      if (UNAUTHENTICATED_PATHS.has(path)) return
      if (path.startsWith(WIDGET_PATH_PREFIX)) return
      if (path.startsWith(WIDGET_APP_PREFIX)) return
      await chatAuthMiddleware(request, reply)
    }
  )

  // Cache-Control: prevent browser caching of API responses
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/chat/')) {
      void reply.header(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, max-age=0'
      )
      void reply.header('Pragma', 'no-cache')
    }
    return payload
  })

  // Authenticated routes
  await app.register(conversationRoutes)
  await app.register(channelRoutes)
  await app.register(aiAgentRoutes)
  await app.register(metaRoutes)

  // Socket.IO auth + handlers (main namespace for operators/agents)
  io.use(createSocketAuthMiddleware(app.log))
  const presence = setupSocketHandlers(io, app.log, options.redisGeneral)

  // Widget namespace (/widget) for visitor real-time messaging
  setupWidgetNamespace({
    io,
    logger: app.log,
    redisSub: options.redisWidgetSub,
    redisPub: options.redisPub,
  })

  app.setErrorHandler<FastifyError>((error, request, reply) => {
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

  return { app, io, presence }
}
