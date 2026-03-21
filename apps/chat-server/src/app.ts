import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import IORedis from 'ioredis';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

export async function buildChatApp() {
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

  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const pubClient = new IORedis(redisUrl);
  const subClient = pubClient.duplicate();

  const io = new Server(app.server, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      credentials: true,
    },
    adapter: createAdapter(pubClient, subClient),
  });

  app.decorate('io', io);

  app.get('/health', async () => ({ status: 'ok' }));

  return { app, io };
}
