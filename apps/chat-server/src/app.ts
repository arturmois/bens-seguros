import Fastify from 'fastify';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type IORedis from 'ioredis';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

import { chatAuthMiddleware } from './infra/http/middleware/chat-auth-middleware.js';
import { createSocketAuthMiddleware } from './infra/socket/socket-auth.js';
import { setupSocketHandlers } from './infra/socket/socket-handler.js';
import type { PresenceTracker } from './infra/socket/presence-tracker.js';
import { conversationRoutes } from './infra/http/routes/conversation-routes.js';
import { channelRoutes } from './infra/http/routes/channel-routes.js';
import { webhookRoutes } from './infra/http/routes/webhook-routes.js';

const UNAUTHENTICATED_PATHS = new Set(['/health', '/chat/webhook/meta']);

interface BuildChatAppOptions {
  readonly redisPub: IORedis;
  readonly redisSub: IORedis;
}

interface ChatAppResult {
  readonly app: FastifyInstance;
  readonly io: Server;
  readonly presence: PresenceTracker;
}

export async function buildChatApp(options: BuildChatAppOptions): Promise<ChatAppResult> {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  const io = new Server(app.server, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      credentials: true,
    },
    adapter: createAdapter(options.redisPub, options.redisSub),
  });

  app.decorate('io', io);

  // Health check (no auth)
  app.get('/health', async () => ({ status: 'ok' }));

  // Unauthenticated routes (Meta webhook)
  await app.register(webhookRoutes);

  // Auth middleware for authenticated routes
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?').at(0) ?? '';
    if (UNAUTHENTICATED_PATHS.has(path)) return;
    await chatAuthMiddleware(request, reply);
  });

  // Authenticated routes
  await app.register(conversationRoutes);
  await app.register(channelRoutes);

  // Socket.IO auth + handlers
  io.use(createSocketAuthMiddleware(app.log));
  const presence = setupSocketHandlers(io, app.log);

  return { app, io, presence };
}
