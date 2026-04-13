import * as Sentry from '@sentry/node'
import { env } from '@repo/env'
import { stripPiiFromEvent } from '@repo/shared/sentry-pii'
import { PINO_REDACT_CONFIG } from '@repo/shared/pino-redact'
import { Channel, connectMongoDB, disconnectMongoDB } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, CHAT_QUEUES } from '@repo/shared'
import {
  decryptToken,
  encryptToken,
  isEncryptedField,
} from '@repo/shared/meta-crypto'
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'
import 'reflect-metadata'
import * as BaileysManager from './messaging/baileys-manager.js'
import type { IncomingMessage } from './messaging/broker.js'

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    serverName: 'bens-chat-worker',
    tracesSampleRate: 0.2,
    beforeSend(event) {
      return stripPiiFromEvent(event)
    },
  })
}
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
  redact: PINO_REDACT_CONFIG,
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

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: { age: 86_400 },
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
        .add(
          'incoming',
          {
            channelId,
            tenantId,
            from: msg.from,
            pushName: msg.pushName,
            text: msg.text,
            type: msg.type,
            mediaUrl: msg.mediaUrl,
            externalId: msg.externalId,
            timestamp: msg.timestamp.toISOString(),
          },
          DEFAULT_JOB_OPTIONS
        )
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
    if (env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: { queue, jobName: job?.name },
        extra: { jobId: job?.id, attemptsMade: job?.attemptsMade },
      })
    }
  })
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

async function processMetaTokenRefresh(): Promise<void> {
  const now = new Date()
  const expiryThreshold = new Date(now.getTime() + SEVEN_DAYS_MS)

  const channels = await Channel.find({
    connectionMethod: 'oauth',
    status: 'CONNECTED',
    isActive: true,
    tokenExpiresAt: { $lt: expiryThreshold },
  })

  logger.info(
    { count: channels.length },
    'Meta token refresh: channels to process'
  )

  for (const channel of channels) {
    const channelId = String(channel._id)
    const tenantId = String(channel.tenantId)

    const rawToken = (channel.config as Record<string, unknown>)['metaToken']

    if (!isEncryptedField(rawToken)) {
      logger.warn(
        { channelId, tenantId },
        'meta.token.refresh_failed: metaToken not an encrypted field, skipping'
      )
      continue
    }

    let plainToken: string
    try {
      plainToken = decryptToken(rawToken)
    } catch (err) {
      logger.warn(
        { channelId, tenantId, err },
        'meta.token.refresh_failed: failed to decrypt token'
      )
      await Channel.updateOne({ _id: channelId }, { status: 'TOKEN_EXPIRED' })
      continue
    }

    const appId = env.META_APP_ID
    const appSecret = env.META_APP_SECRET

    if (!appId || !appSecret) {
      logger.warn(
        { channelId, tenantId },
        'meta.token.refresh_failed: META_APP_ID or META_APP_SECRET not configured'
      )
      continue
    }

    const url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${plainToken}`

    let newToken: string
    let newExpiresAt: Date

    try {
      const response = await fetch(url)

      if (!response.ok) {
        const body = await response.text()
        logger.warn(
          { channelId, tenantId, status: response.status, body },
          'meta.token.refresh_failed: Meta API returned error'
        )
        await Channel.updateOne({ _id: channelId }, { status: 'TOKEN_EXPIRED' })
        continue
      }

      const data = (await response.json()) as Record<string, unknown>
      const accessToken = data['access_token']
      const expiresIn = data['expires_in']

      if (typeof accessToken !== 'string' || !accessToken) {
        logger.warn(
          { channelId, tenantId },
          'meta.token.refresh_failed: no access_token in response'
        )
        await Channel.updateOne({ _id: channelId }, { status: 'TOKEN_EXPIRED' })
        continue
      }

      newToken = accessToken
      newExpiresAt =
        typeof expiresIn === 'number'
          ? new Date(Date.now() + expiresIn * 1000)
          : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    } catch (err) {
      logger.warn(
        { channelId, tenantId, err },
        'meta.token.refresh_failed: network error calling Meta API'
      )
      await Channel.updateOne({ _id: channelId }, { status: 'TOKEN_EXPIRED' })
      continue
    }

    const encryptedToken = encryptToken(newToken)

    await Channel.updateOne(
      { _id: channelId },
      {
        'config.metaToken': encryptedToken,
        tokenExpiresAt: newExpiresAt,
      }
    )

    logger.info(
      { channelId, tenantId, expiresAt: newExpiresAt },
      'meta.token.refreshed'
    )
  }
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
    {
      ...DEFAULT_JOB_OPTIONS,
      repeat: { pattern: '0 * * * *' },
      jobId: 'auto-close-repeatable',
    }
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

  const disconnectChannelWorker = new Worker(
    CHAT_QUEUES.DISCONNECT_CHANNEL,
    async (job) => {
      const channelId = String(job.data['channelId'] ?? '')
      logger.info({ channelId }, 'Disconnecting deactivated channel')
      await BaileysManager.disconnectChannel(channelId)
      await BaileysManager.cleanupSession(channelId)
      await qrStateManager.clearState(channelId)
    },
    { ...workerDefaults, concurrency: 2 }
  )

  attachWorkerErrorLogger(sendWorker, CHAT_QUEUES.SEND_MESSAGE)
  attachWorkerErrorLogger(incomingWorker, CHAT_QUEUES.PROCESS_INCOMING)
  attachWorkerErrorLogger(aiBotWorker, CHAT_QUEUES.AI_BOT)
  attachWorkerErrorLogger(autoCloseWorker, CHAT_QUEUES.AUTO_CLOSE)
  attachWorkerErrorLogger(connectChannelWorker, CHAT_QUEUES.CONNECT_CHANNEL)
  attachWorkerErrorLogger(pairChannelWorker, CHAT_QUEUES.PAIR_CHANNEL)
  attachWorkerErrorLogger(
    disconnectChannelWorker,
    CHAT_QUEUES.DISCONNECT_CHANNEL
  )

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

  // Meta token refresh: daily cron at 3AM to refresh expiring OAuth tokens
  const metaTokenRefreshQueue = new Queue(CHAT_QUEUES.META_TOKEN_REFRESH, {
    connection: bullmqConnection,
  })
  await metaTokenRefreshQueue.upsertJobScheduler(
    'meta-token-refresh-daily',
    { pattern: '0 3 * * *' },
    { name: 'refresh-meta-tokens' }
  )
  const metaTokenRefreshWorker = new Worker(
    CHAT_QUEUES.META_TOKEN_REFRESH,
    processMetaTokenRefresh,
    { ...workerDefaults, concurrency: 1 }
  )
  attachWorkerErrorLogger(
    metaTokenRefreshWorker,
    CHAT_QUEUES.META_TOKEN_REFRESH
  )

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
      disconnectChannelWorker.close(),
      mediaMigrationWorker.close(),
      metaTokenRefreshWorker.close(),
    ])

    await aiBotQueue.close()
    await sendMessageQueue.close()
    await incomingQueue.close()
    await autoCloseQueue.close()
    await mediaMigrationQueue.close()
    await metaTokenRefreshQueue.close()

    await disconnectMongoDB()
    await pubsubRedis.quit()

    if (env.SENTRY_DSN) {
      await Sentry.close(2000)
    }

    process.exit(0)
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Chat worker bootstrap failed')
  if (env.SENTRY_DSN) {
    Sentry.captureException(err)
    void Sentry.close(2000).then(() => process.exit(1))
  } else {
    process.exit(1)
  }
})
