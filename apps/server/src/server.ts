import * as Sentry from '@sentry/node'
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

  await app.listen({ port, host })
  app.log.info(`Server running on http://${host}:${port}`)
}

start().catch((err) => {
  if (env.SENTRY_DSN) {
    Sentry.captureException(err)
  }
  process.exitCode = 1
  throw err
})
