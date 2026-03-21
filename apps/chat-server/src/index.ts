import 'reflect-metadata';
import IORedis from 'ioredis';
import pino from 'pino';
import { connectMongoDB } from '@repo/db-chat';

import { buildChatApp } from './app.js';
import { registerDependencies } from './infra/di/registry.js';
import { RedisSubscriber } from './infra/pubsub/redis-subscriber.js';

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

function parseRedisUrl(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port) || 6379,
  };
}

const start = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/bens-chat';
  await connectMongoDB(mongoUri);
  logger.info('MongoDB connected');

  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const redisPub = new IORedis(redisUrl);
  const redisSub = redisPub.duplicate();
  const redisSubscriber = new IORedis(redisUrl);

  const redisInfo = parseRedisUrl(redisUrl);
  const queueConnection = {
    host: redisInfo.host,
    port: redisInfo.port,
    maxRetriesPerRequest: null,
  };

  registerDependencies(queueConnection, logger);

  const { app, io, presence } = await buildChatApp({ redisPub, redisSub });

  const subscriber = new RedisSubscriber(redisSubscriber, io, logger);
  await subscriber.subscribe();

  const port = Number(process.env.CHAT_PORT ?? 3002);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
  logger.info({ port, host }, 'Chat server running');

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down chat server...');
    presence.stop();
    await app.close();
    redisPub.disconnect();
    redisSub.disconnect();
    redisSubscriber.disconnect();
    logger.info('Chat server shut down');
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
};

start().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start chat server');
  process.exit(1);
});
