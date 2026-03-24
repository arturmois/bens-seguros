import * as Sentry from '@sentry/nextjs'
import { stripPiiFromEvent } from '@repo/shared/sentry-pii'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      return stripPiiFromEvent(event)
    },
  })
}
