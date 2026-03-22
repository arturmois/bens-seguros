import 'reflect-metadata'
import pino from 'pino'
import { setupAuditArchiveProcessor } from './processors/audit-archive-processor.js'

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

logger.info('ERP Worker started. Active processors: audit-archive')

const gracefulShutdown = async () => {
  logger.info('Shutting down worker...')
  await auditArchive.worker.close()
  await auditArchive.queue.close()
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
