import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
import { Queue } from 'bullmq'
import type { FastifyInstance } from 'fastify'

const QUEUE_NAMES = [
  'erp-notifications',
  'erp-policy-expiry',
  'erp-audit-archive',
  'chat-send-message',
  'chat-incoming-message',
  'chat-ai-bot',
]

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

export function setupBullBoard(app: FastifyInstance) {
  const redisInfo = parseRedisUrl(
    process.env.REDIS_URL ?? 'redis://localhost:6379'
  )
  const connection = {
    host: redisInfo.host,
    port: redisInfo.port,
    ...(redisInfo.password ? { password: redisInfo.password } : {}),
  }

  const queues = QUEUE_NAMES.map(
    (name) => new BullMQAdapter(new Queue(name, { connection }))
  )

  const serverAdapter = new FastifyAdapter()
  serverAdapter.setBasePath('/admin/queues')

  createBullBoard({ queues, serverAdapter })

  app.register(serverAdapter.registerPlugin(), {
    prefix: '/admin/queues',
  })
}
