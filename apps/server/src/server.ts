import * as Sentry from '@sentry/node'
import { prisma } from '@repo/db'
import { env } from '@repo/env'
import { stripPiiFromEvent } from '@repo/shared/sentry-pii'
import { buildApp } from './app.js'

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      return stripPiiFromEvent(event)
    },
  })
}

const start = async () => {
  const app = await buildApp()

  const port = env.PORT ?? 3001
  const host = env.HOST

  // Verify RLS is enabled and forced on tenant-scoped tables (AA-001)
  const [rlsCheck] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT count(*) FROM pg_class
    WHERE relname = 'Client'
      AND relrowsecurity = true
      AND relforcerowsecurity = true
  `
  if (rlsCheck.count === 0n) {
    app.log.error(
      'RLS health check FAILED: Client table does not have RLS enabled+forced'
    )
    process.exit(1)
  }

  await app.listen({ port, host })
  app.log.info(`Server running on http://${host}:${port}`)

  const shutdown = async () => {
    app.log.info('Shutting down server...')
    await app.close()
    if (env.SENTRY_DSN) {
      await Sentry.close(2000)
    }
    app.log.info('Server shut down')
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown())
  process.on('SIGINT', () => void shutdown())
}

start().catch((err) => {
  if (env.SENTRY_DSN) {
    Sentry.captureException(err)
    void Sentry.close(2000).then(() => {
      process.exitCode = 1
      throw err
    })
  } else {
    process.exitCode = 1
    throw err
  }
})
