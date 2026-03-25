import pino from 'pino'
import 'reflect-metadata'
import { setupAuditArchiveProcessor } from './processors/audit-archive-processor.js'
import { setupNotificationProcessor } from './processors/notification-processor.js'
import { setupProactiveAlertsProcessor } from './processors/alerts/index.js'

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
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

const redisInfo = parseRedisUrl(
  process.env.REDIS_URL ?? 'redis://localhost:6379'
)
const connection = {
  host: redisInfo.host,
  port: redisInfo.port,
  ...(redisInfo.password ? { password: redisInfo.password } : {}),
  maxRetriesPerRequest: null as null,
}

const auditArchive = setupAuditArchiveProcessor(connection)
const notifications = setupNotificationProcessor(connection)
const proactiveAlerts = setupProactiveAlertsProcessor(
  connection,
  notifications.queue
)

logger.info(
  'ERP Worker started. Active processors: audit-archive, notifications, proactive-alerts'
)

const gracefulShutdown = async () => {
  logger.info('Shutting down worker...')
  await Promise.all([
    auditArchive.worker.close(),
    notifications.worker.close(),
    proactiveAlerts.worker.close(),
  ])
  await Promise.all([
    auditArchive.queue.close(),
    notifications.queue.close(),
    proactiveAlerts.queue.close(),
  ])
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
