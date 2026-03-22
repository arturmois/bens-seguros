import 'reflect-metadata';
import pino from 'pino';
import IORedis from 'ioredis';
import { Worker, Queue } from 'bullmq';
import { connectMongoDB, disconnectMongoDB } from '@repo/db-chat';
import { CHAT_QUEUES, CHAT_PUBSUB_CHANNELS } from '@repo/shared';
import { env } from '@repo/env';
import * as BaileysManager from './messaging/baileys-manager.js';
import { createSendMessageProcessor } from './processors/send-message-processor.js';
import { createIncomingMessageProcessor } from './processors/incoming-message-processor.js';
import { createAutoCloseProcessor } from './processors/auto-close-processor.js';
import { createAiBotProcessor } from './processors/ai-bot-processor.js';
import type { IncomingMessage } from './messaging/broker.js';

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  name: 'chat-worker',
});

const REDIS_URL = env.REDIS_URL;

function parseRedisUrl(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port) || 6379,
  };
}

const redisInfo = parseRedisUrl(REDIS_URL);

// BullMQ needs plain connection options to avoid IORedis version mismatch
const bullmqConnection = {
  host: redisInfo.host,
  port: redisInfo.port,
  maxRetriesPerRequest: null as null,
};

// IORedis instance used only for pub/sub publishing
const pubsubRedis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

function buildChannelEvents(channelId: string, tenantId: string, incomingQueue: Queue) {
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
          logger.error({ err, channelId, tenantId }, 'Failed to enqueue incoming message');
        });
    },
    onStatusUpdate: (update: { externalId: string; status: string }) => {
      pubsubRedis
        .publish(
          CHAT_PUBSUB_CHANNELS.MESSAGE_STATUS,
          JSON.stringify({ channelId, tenantId, ...update }),
        )
        .catch((err: unknown) => {
          logger.error({ err, channelId }, 'Failed to publish status update');
        });
    },
    onConnectionUpdate: (status: string, qr?: string) => {
      logger.info({ channelId, tenantId, status }, 'Channel connection update');
      pubsubRedis
        .publish(
          CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS,
          JSON.stringify({ channelId, tenantId, status, qr }),
        )
        .catch((err: unknown) => {
          logger.error({ err, channelId }, 'Failed to publish connection update');
        });
    },
  };
}

function attachWorkerErrorLogger(worker: Worker, queue: string): void {
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, queue, err }, 'Job failed');
  });
}

async function bootstrap(): Promise<void> {
  logger.info('Connecting to MongoDB...');
  await connectMongoDB(env.MONGODB_URL);

  const aiBotQueue = new Queue(CHAT_QUEUES.AI_BOT, { connection: bullmqConnection });
  const incomingQueue = new Queue(CHAT_QUEUES.PROCESS_INCOMING, { connection: bullmqConnection });
  const autoCloseQueue = new Queue(CHAT_QUEUES.AUTO_CLOSE, { connection: bullmqConnection });

  await autoCloseQueue.add(
    'auto-close',
    {},
    { repeat: { pattern: '0 * * * *' }, jobId: 'auto-close-repeatable' },
  );

  const sendWorker = new Worker(
    CHAT_QUEUES.SEND_MESSAGE,
    createSendMessageProcessor(BaileysManager, pubsubRedis),
    { connection: bullmqConnection, concurrency: 5 },
  );

  const incomingWorker = new Worker(
    CHAT_QUEUES.PROCESS_INCOMING,
    createIncomingMessageProcessor(pubsubRedis, aiBotQueue),
    { connection: bullmqConnection, concurrency: 3 },
  );

  const aiBotWorker = new Worker(CHAT_QUEUES.AI_BOT, createAiBotProcessor(pubsubRedis), {
    connection: bullmqConnection,
    concurrency: 3,
  });

  const autoCloseWorker = new Worker(
    CHAT_QUEUES.AUTO_CLOSE,
    createAutoCloseProcessor(pubsubRedis),
    { connection: bullmqConnection, concurrency: 1 },
  );

  attachWorkerErrorLogger(sendWorker, CHAT_QUEUES.SEND_MESSAGE);
  attachWorkerErrorLogger(incomingWorker, CHAT_QUEUES.PROCESS_INCOMING);
  attachWorkerErrorLogger(aiBotWorker, CHAT_QUEUES.AI_BOT);
  attachWorkerErrorLogger(autoCloseWorker, CHAT_QUEUES.AUTO_CLOSE);

  logger.info('Loading active Baileys channels...');
  await BaileysManager.loadActiveChannels((channelId, tenantId) =>
    buildChannelEvents(channelId, tenantId, incomingQueue),
  );

  logger.info('Chat Worker started. Listening for jobs...');

  const gracefulShutdown = async (): Promise<void> => {
    logger.info('Shutting down chat worker...');

    await BaileysManager.disconnectAll();

    await Promise.all([
      sendWorker.close(),
      incomingWorker.close(),
      aiBotWorker.close(),
      autoCloseWorker.close(),
    ]);

    await aiBotQueue.close();
    await incomingQueue.close();
    await autoCloseQueue.close();

    await disconnectMongoDB();
    await pubsubRedis.quit();

    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Chat worker bootstrap failed');
  process.exit(1);
});
