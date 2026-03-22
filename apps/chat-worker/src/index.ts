import { connectMongoDB, disconnectMongoDB } from '@repo/db-chat'
import { env } from '@repo/env'
import { CHAT_PUBSUB_CHANNELS, CHAT_QUEUES } from '@repo/shared'
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'
import 'reflect-metadata'
import * as BaileysManager from './messaging/baileys-manager.js'
import type { IncomingMessage } from './messaging/broker.js'
import { createAiBotProcessor } from './processors/ai-bot-processor.js'
import { createAutoCloseProcessor } from './processors/auto-close-processor.js'
import { createConnectChannelProcessor } from './processors/connect-channel-processor.js'
import { createIncomingMessageProcessor } from './processors/incoming-message-processor.js'
import { processMediaMigration } from './processors/media-migration-processor.js'
import { createPairChannelProcessor } from './processors/pair-channel-processor.js'
import { createSendMessageProcessor } from './processors/send-message-processor.js'
import { QrStateManager } from './whatsapp/qr-state-manager.js'

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  name: 'chat-worker',
})

const REDIS_URL = env.REDIS_URL

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

const redisInfo = parseRedisUrl(REDIS_URL)

// BullMQ needs plain connection options to avoid IORedis version mismatch
const bullmqConnection = {
  host: redisInfo.host,
  port: redisInfo.port,
  ...(redisInfo.password ? { password: redisInfo.password } : {}),
  maxRetriesPerRequest: null as null,
}

// IORedis instance used only for pub/sub publishing
const pubsubRedis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })

function buildChannelEvents(
  channelId: string,
  tenantId: string,
  incomingQueue: Queue,
  qrStateManager: QrStateManager
) {
  return {
    onMessage: (msg: IncomingMessage) => {
      incomingQueue
        .add('incoming', {
          channelId,
          tenantId,
          from: msg.from,
          pushName: msg.pushName,
          text: msg.text,
          type: msg.type,
          mediaUrl: msg.mediaUrl,
          externalId: msg.externalId,
          timestamp: msg.timestamp.toISOString(),
        })
        .catch((err: unknown) => {
          logger.error(
            { err, channelId, tenantId },
            'Failed to enqueue incoming message'
          )
        })
    },
    onStatusUpdate: (update: { externalId: string; status: string }) => {
      pubsubRedis
        .publish(
          CHAT_PUBSUB_CHANNELS.MESSAGE_STATUS,
          JSON.stringify({ channelId, tenantId, ...update })
        )
        .catch((err: unknown) => {
          logger.error({ err, channelId }, 'Failed to publish status update')
        })
    },
    onConnectionUpdate: (status: string, qr?: string) => {
      logger.info({ channelId, tenantId, status }, 'Channel connection update')

      if (status === 'QR_PENDING' && qr) {
        qrStateManager.emitQr(channelId, tenantId, qr).catch((err: unknown) => {
          logger.error({ err, channelId }, 'Failed to persist QR state')
        })
        return
      }

      if (status === 'CONNECTED') {
        qrStateManager
          .emitConnected(channelId, tenantId)
          .catch((err: unknown) => {
            logger.error(
              { err, channelId },
              'Failed to persist connected state'
            )
          })
        return
      }

      qrStateManager
        .emitDisconnected(channelId, tenantId)
        .catch((err: unknown) => {
          logger.error(
            { err, channelId },
            'Failed to persist disconnected state'
          )
        })
    },
  }
}

function attachWorkerErrorLogger(worker: Worker, queue: string): void {
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, queue, err }, 'Job failed')
  })
}

async function bootstrap(): Promise<void> {
  logger.info('Connecting to MongoDB...')
  await connectMongoDB(env.MONGODB_URL)

  const qrStateManager = new QrStateManager(pubsubRedis)

  const aiBotQueue = new Queue(CHAT_QUEUES.AI_BOT, {
    connection: bullmqConnection,
  })
  const incomingQueue = new Queue(CHAT_QUEUES.PROCESS_INCOMING, {
    connection: bullmqConnection,
  })
  const autoCloseQueue = new Queue(CHAT_QUEUES.AUTO_CLOSE, {
    connection: bullmqConnection,
  })

  await autoCloseQueue.add(
    'auto-close',
    {},
    { repeat: { pattern: '0 * * * *' }, jobId: 'auto-close-repeatable' }
  )

  const workerDefaults = {
    connection: bullmqConnection,
    lockDuration: 30_000,
    maxStalledCount: 2,
    stalledInterval: 5_000,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86_400 },
  }

  const sendWorker = new Worker(
    CHAT_QUEUES.SEND_MESSAGE,
    createSendMessageProcessor(BaileysManager, pubsubRedis),
    { ...workerDefaults, concurrency: 5 }
  )

  const incomingWorker = new Worker(
    CHAT_QUEUES.PROCESS_INCOMING,
    createIncomingMessageProcessor(pubsubRedis, aiBotQueue),
    { ...workerDefaults, concurrency: 3 }
  )

  const sendMessageQueue = new Queue(CHAT_QUEUES.SEND_MESSAGE, {
    connection: bullmqConnection,
  })

  const aiBotWorker = new Worker(
    CHAT_QUEUES.AI_BOT,
    createAiBotProcessor(pubsubRedis, sendMessageQueue),
    { ...workerDefaults, concurrency: 5 }
  )

  const autoCloseWorker = new Worker(
    CHAT_QUEUES.AUTO_CLOSE,
    createAutoCloseProcessor(pubsubRedis),
    { ...workerDefaults, concurrency: 1 }
  )

  const connectChannelWorker = new Worker(
    CHAT_QUEUES.CONNECT_CHANNEL,
    createConnectChannelProcessor(BaileysManager, qrStateManager, (chId, tId) =>
      buildChannelEvents(chId, tId, incomingQueue, qrStateManager)
    ),
    { ...workerDefaults, concurrency: 2 }
  )

  const pairChannelWorker = new Worker(
    CHAT_QUEUES.PAIR_CHANNEL,
    createPairChannelProcessor(
      BaileysManager,
      qrStateManager,
      pubsubRedis,
      (chId, tId) =>
        buildChannelEvents(chId, tId, incomingQueue, qrStateManager)
    ),
    { ...workerDefaults, concurrency: 1 }
  )

  attachWorkerErrorLogger(sendWorker, CHAT_QUEUES.SEND_MESSAGE)
  attachWorkerErrorLogger(incomingWorker, CHAT_QUEUES.PROCESS_INCOMING)
  attachWorkerErrorLogger(aiBotWorker, CHAT_QUEUES.AI_BOT)
  attachWorkerErrorLogger(autoCloseWorker, CHAT_QUEUES.AUTO_CLOSE)
  attachWorkerErrorLogger(connectChannelWorker, CHAT_QUEUES.CONNECT_CHANNEL)
  attachWorkerErrorLogger(pairChannelWorker, CHAT_QUEUES.PAIR_CHANNEL)

  // Media migration: weekly cron to move old media to R2
  const mediaMigrationQueue = new Queue('chat-media-migration', {
    connection: bullmqConnection,
  })
  await mediaMigrationQueue.upsertJobScheduler(
    'media-migration-weekly',
    { pattern: '0 2 * * 0' },
    { name: 'migrate-old-media' }
  )
  const mediaMigrationWorker = new Worker(
    'chat-media-migration',
    processMediaMigration,
    { ...workerDefaults, concurrency: 1 }
  )
  attachWorkerErrorLogger(mediaMigrationWorker, 'chat-media-migration')

  logger.info('Loading active Baileys channels...')
  await BaileysManager.loadActiveChannels((channelId, tenantId) =>
    buildChannelEvents(channelId, tenantId, incomingQueue, qrStateManager)
  )

  logger.info('Chat Worker started. Listening for jobs...')

  const gracefulShutdown = async (): Promise<void> => {
    logger.info('Shutting down chat worker...')

    await BaileysManager.disconnectAll()

    await Promise.all([
      sendWorker.close(),
      incomingWorker.close(),
      aiBotWorker.close(),
      autoCloseWorker.close(),
      connectChannelWorker.close(),
      pairChannelWorker.close(),
      mediaMigrationWorker.close(),
    ])

    await aiBotQueue.close()
    await sendMessageQueue.close()
    await incomingQueue.close()
    await autoCloseQueue.close()
    await mediaMigrationQueue.close()

    await disconnectMongoDB()
    await pubsubRedis.quit()

    process.exit(0)
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Chat worker bootstrap failed')
  process.exit(1)
})
