import pino from 'pino'
import 'reflect-metadata'
import { setupAuditArchiveProcessor } from './processors/audit-archive-processor.js'
import { setupCsvImportProcessor } from './processors/csv-import-processor.js'
import { setupNotificationProcessor } from './processors/notification-processor.js'
import { setupProactiveAlertsProcessor } from './processors/alerts/index.js'
import { env } from '@repo/env'

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
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

const redisInfo = parseRedisUrl(env.REDIS_URL)
const connection = {
  host: redisInfo.host,
  port: redisInfo.port,
  ...(redisInfo.password ? { password: redisInfo.password } : {}),
  maxRetriesPerRequest: null as null,
}

const auditArchive = setupAuditArchiveProcessor(connection)
const csvImport = setupCsvImportProcessor(connection)
const notifications = setupNotificationProcessor(connection)
const proactiveAlerts = setupProactiveAlertsProcessor(
  connection,
  notifications.queue
)

logger.info(
  'ERP Worker started. Active processors: audit-archive, csv-import, notifications, proactive-alerts'
)

const gracefulShutdown = async () => {
  logger.info('Shutting down worker...')
  await Promise.all([
    auditArchive.worker.close(),
    csvImport.worker.close(),
    notifications.worker.close(),
    proactiveAlerts.worker.close(),
  ])
  await Promise.all([
    auditArchive.queue.close(),
    csvImport.queue.close(),
    notifications.queue.close(),
    proactiveAlerts.queue.close(),
  ])
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
