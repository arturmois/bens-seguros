import * as Sentry from '@sentry/nextjs'
import { stripPiiFromEvent } from '@repo/shared/sentry-pii'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    beforeSend(event) {
      return stripPiiFromEvent(event)
    },
  })
}
