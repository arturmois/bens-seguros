import { connectMongoDB } from '@repo/db-chat'
import { env } from '@repo/env'
import { stripPiiFromEvent } from '@repo/shared/sentry-pii'
import * as Sentry from '@sentry/node'
import IORedis from 'ioredis'
import pino from 'pino'
import 'reflect-metadata'

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    serverName: 'bens-chat-server',
    tracesSampleRate: 0.2,
    beforeSend(event) {
      return stripPiiFromEvent(event)
    },
  })
}

import { buildChatApp } from './app.js'
import { registerDependencies } from './infra/di/registry.js'
import { PINO_REDACT_CONFIG } from './infra/logger.js'
import { RedisSubscriber } from './infra/pubsub/redis-subscriber.js'

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: PINO_REDACT_CONFIG,
})

function parseRedisUrl(url: string): {
  host: string
  port: number
  password?: string
} {
  const parsed = new URL(url)
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port) || 6379,
    ...(parsed.password
      ? { password: decodeURIComponent(parsed.password) }
      : {}),
  }
}

const start = async (): Promise<void> => {
  const mongoUri = env.MONGODB_URL
  await connectMongoDB(mongoUri)
  logger.info('MongoDB connected')

  const redisUrl = env.REDIS_URL
  const redisPub = new IORedis(redisUrl)
  const redisSub = redisPub.duplicate()
  const redisSubscriber = new IORedis(redisUrl)
  const redisWidgetSub = new IORedis(redisUrl)
  const redisGeneral = new IORedis(redisUrl)

  const redisInfo = parseRedisUrl(redisUrl)
  const queueConnection = {
    host: redisInfo.host,
    port: redisInfo.port,
    ...(redisInfo.password ? { password: redisInfo.password } : {}),
    maxRetriesPerRequest: null,
  }

  registerDependencies(queueConnection, logger)

  const { app, io, presence } = await buildChatApp({
    redisPub,
    redisSub,
    redisGeneral,
    redisWidgetSub,
  })

  const subscriber = new RedisSubscriber(redisSubscriber, io, logger)
  await subscriber.subscribe()

  const port = env.PORT ?? 3002
  const host = env.HOST

  await app.listen({ port, host })
  logger.info({ port, host }, 'Chat server running')

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down chat server...')
    presence.stop()
    await app.close()
    redisPub.disconnect()
    redisSub.disconnect()
    redisSubscriber.disconnect()
    redisWidgetSub.disconnect()
    redisGeneral.disconnect()
    logger.info('Chat server shut down')
  }

  process.on('SIGTERM', () => void shutdown())
  process.on('SIGINT', () => void shutdown())
}

start().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start chat server')
  process.exit(1)
})
