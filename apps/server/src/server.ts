import * as Sentry from '@sentry/node'
import { buildApp } from './app.js'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
  })
}

const start = async () => {
  const app = await buildApp()

  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '0.0.0.0'

  await app.listen({ port, host })
  app.log.info(`Server running on http://${host}:${port}`)
}

start().catch((err) => {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err)
  }
  process.exitCode = 1
  throw err
})
