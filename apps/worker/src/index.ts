import * as Sentry from '@sentry/node'
import { env } from '@repo/env'
import { stripPiiFromEvent } from '@repo/shared/sentry-pii'
import { PINO_REDACT_CONFIG } from '@repo/shared/pino-redact'
import type { Job, Worker } from 'bullmq'
import pino from 'pino'
import 'reflect-metadata'
import { setupAuditArchiveProcessor } from './processors/audit-archive-processor.js'
import { setupCsvImportProcessor } from './processors/csv-import-processor.js'
import { setupExpirePoliciesProcessor } from './processors/expire-policies-processor.js'
import { setupExpireSubscriptionsProcessor } from './processors/expire-subscriptions-processor.js'
import { setupNotificationProcessor } from './processors/notification-processor.js'
import { setupProactiveAlertsProcessor } from './processors/alerts/index.js'
import { setupSendQuoteEmailProcessor } from './processors/send-quote-email-processor.js'
import { setupTrialExpiryProcessor } from './processors/trial-expiry-processor.js'
import { setupWebhookReconciliationProcessor } from './processors/webhook-reconciliation-processor.js'

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    serverName: 'bens-worker',
    tracesSampleRate: 0.2,
    beforeSend(event) {
      return stripPiiFromEvent(event)
    },
  })
}

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  name: 'worker',
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

const redisInfo = parseRedisUrl(env.REDIS_URL)
const connection = {
  host: redisInfo.host,
  port: redisInfo.port,
  ...(redisInfo.password ? { password: redisInfo.password } : {}),
  maxRetriesPerRequest: null as null,
}

const auditArchive = setupAuditArchiveProcessor(connection)
const csvImport = setupCsvImportProcessor(connection)
const expirePolicies = setupExpirePoliciesProcessor(connection)
const expireSubscriptions = setupExpireSubscriptionsProcessor(connection)
const notifications = setupNotificationProcessor(connection)
const proactiveAlerts = setupProactiveAlertsProcessor(
  connection,
  notifications.queue
)
const sendQuoteEmail = setupSendQuoteEmailProcessor(connection)
const trialExpiry = setupTrialExpiryProcessor(connection)
const webhookReconciliation = setupWebhookReconciliationProcessor(connection)

const allWorkers: Worker[] = [
  auditArchive.worker,
  csvImport.worker,
  expirePolicies.worker,
  expireSubscriptions.worker,
  notifications.worker,
  proactiveAlerts.worker,
  sendQuoteEmail.worker,
  trialExpiry.worker,
  webhookReconciliation.worker,
]

for (const w of allWorkers) {
  w.on('failed', (job: Job | undefined, err: Error) => {
    if (env.SENTRY_DSN) {
      Sentry.captureException(err, {
        tags: { queue: w.name, jobName: job?.name },
        extra: { jobId: job?.id, attemptsMade: job?.attemptsMade },
      })
    }
  })
}

logger.info(
  'ERP Worker started. Active processors: audit-archive, csv-import, expire-policies, expire-subscriptions, notifications, proactive-alerts, send-quote-email, trial-expiry, webhook-reconciliation'
)

const gracefulShutdown = async () => {
  logger.info('Shutting down worker...')
  await Promise.all([
    auditArchive.worker.close(),
    csvImport.worker.close(),
    expirePolicies.worker.close(),
    expireSubscriptions.worker.close(),
    notifications.worker.close(),
    proactiveAlerts.worker.close(),
    sendQuoteEmail.worker.close(),
    trialExpiry.worker.close(),
    webhookReconciliation.worker.close(),
  ])
  await Promise.all([
    auditArchive.queue.close(),
    csvImport.queue.close(),
    expirePolicies.queue.close(),
    expireSubscriptions.queue.close(),
    notifications.queue.close(),
    proactiveAlerts.queue.close(),
    sendQuoteEmail.queue.close(),
    trialExpiry.queue.close(),
    webhookReconciliation.queue.close(),
  ])
  if (env.SENTRY_DSN) {
    await Sentry.close(2000)
  }
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception in worker')
  if (env.SENTRY_DSN) {
    Sentry.captureException(err)
    void Sentry.close(2000).then(() => process.exit(1))
  } else {
    process.exit(1)
  }
})
