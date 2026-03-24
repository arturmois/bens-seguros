import cors from '@fastify/cors'
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
import type { PresenceTracker } from './infra/socket/presence-tracker.js'
import { createSocketAuthMiddleware } from './infra/socket/socket-auth.js'
import { setupSocketHandlers } from './infra/socket/socket-handler.js'

const UNAUTHENTICATED_PATHS = new Set(['/health', '/chat/webhook/meta'])

interface BuildChatAppOptions {
  readonly redisPub: IORedis
  readonly redisSub: IORedis
  readonly redisGeneral: IORedis
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
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  const io = new Server(app.server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
    adapter: createAdapter(options.redisPub, options.redisSub),
  })

  app.decorate('io', io)

  // Health check (no auth)
  app.get('/health', async () => ({ status: 'ok' }))

  // Unauthenticated routes (Meta webhook)
  await app.register(webhookRoutes)

  // Auth middleware for authenticated routes
  app.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const path = request.url.split('?').at(0) ?? ''
      if (UNAUTHENTICATED_PATHS.has(path)) return
      await chatAuthMiddleware(request, reply)
    }
  )

  // Authenticated routes
  await app.register(conversationRoutes)
  await app.register(channelRoutes)
  await app.register(aiAgentRoutes)

  // Socket.IO auth + handlers
  io.use(createSocketAuthMiddleware(app.log))
  const presence = setupSocketHandlers(io, app.log, options.redisGeneral)

  return { app, io, presence }
}
