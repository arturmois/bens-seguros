import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '@repo/env'
import { createAdapter } from '@socket.io/redis-adapter'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import type IORedis from 'ioredis'
import { Server } from 'socket.io'

import { chatAuthMiddleware } from './infra/http/middleware/chat-auth-middleware.js'
import { PINO_REDACT_CONFIG } from './infra/logger.js'
import { aiAgentRoutes } from './infra/http/routes/ai-agent-routes.js'
import { channelRoutes } from './infra/http/routes/channel-routes.js'
import { conversationRoutes } from './infra/http/routes/conversation-routes.js'
import { webhookRoutes } from './infra/http/routes/webhook-routes.js'
import { widgetRoutes } from './infra/http/routes/widget-routes.js'
import type { PresenceTracker } from './infra/socket/presence-tracker.js'
import { createSocketAuthMiddleware } from './infra/socket/socket-auth.js'
import { setupSocketHandlers } from './infra/socket/socket-handler.js'
import { setupWidgetNamespace } from './infra/socket/widget-namespace.js'

const UNAUTHENTICATED_PATHS = new Set(['/health', '/chat/webhook/meta'])
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
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: (origin, callback) => {
      // Always allow the frontend
      if (!origin || origin === env.FRONTEND_URL) {
        callback(null, true)
        return
      }
      // Allow any origin for /widget/* routes — origin validated per-channel in route handler
      // @fastify/cors doesn't have per-route config, so we allow here and validate in handler
      callback(null, true)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
        if (!origin || origin === env.FRONTEND_URL) {
          callback(null, true)
          return
        }
        // All other origins are allowed because the /widget namespace serves
        // embeddable widgets on arbitrary domains. Auth is enforced per-socket via JWT.
        callback(null, true)
      },
      credentials: true,
    },
    adapter: createAdapter(options.redisPub, options.redisSub),
  })

  app.decorate('io', io)
  app.decorate('redisPub', options.redisPub)

  // Health check (no auth)
  app.get('/health', async () => ({ status: 'ok' }))

  // Widget static assets — SPA served at /widget-app/, embed.js at /widget/embed.js
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const widgetDistPath = path.resolve(currentDir, '../../widget/dist')
  await app.register(fastifyStatic, {
    root: widgetDistPath,
    prefix: WIDGET_APP_PREFIX,
    decorateReply: false,
  })
  app.get('/widget/embed.js', async (_request, reply) => {
    const content = readFileSync(path.join(widgetDistPath, 'embed.js'), 'utf-8')
    return reply.type('application/javascript').send(content)
  })

  // Unauthenticated routes (Meta webhook)
  await app.register(webhookRoutes)

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

  return { app, io, presence }
}
