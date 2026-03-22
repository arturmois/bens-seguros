import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import type { FastifyInstance } from 'fastify';

const QUEUE_NAMES = [
  'erp-notifications',
  'erp-policy-expiry',
  'erp-audit-archive',
  'chat-send-message',
  'chat-incoming-message',
  'chat-ai-bot',
];

export function setupBullBoard(app: FastifyInstance) {
  const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  const queues = QUEUE_NAMES.map((name) => new BullMQAdapter(new Queue(name, { connection })));

  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({ queues, serverAdapter });

  app.register(serverAdapter.registerPlugin(), {
    basePath: '/admin/queues',
    prefix: '/admin/queues',
  });
}
