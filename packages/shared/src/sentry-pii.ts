/**
 * PII stripping utility for Sentry error events.
 *
 * Uses a minimal interface compatible with both @sentry/nextjs and @sentry/node
 * ErrorEvent types, so neither package needs to be a dependency of @repo/shared.
 */

const SENSITIVE_FIELDS = [
  'cpf',
  'cnpj',
  'email',
  'phone',
  'password',
  'token',
  'birthDate',
  'document',
] as const

const REDACTED = '[REDACTED]'

/** Minimal event shape compatible with both @sentry/nextjs and @sentry/node ErrorEvent */
export interface SentryErrorEvent {
  type?: unknown
  request?: {
    data?: unknown
    query_string?: unknown
  }
  user?: {
    id?: string | number
  }
}

function redactSensitiveFields(data: Record<string, unknown>): void {
  for (const field of SENSITIVE_FIELDS) {
    if (field in data) {
      data[field] = REDACTED
    }
  }
}

function redactRequestData(
  request: NonNullable<SentryErrorEvent['request']>
): void {
  if (!request.data) {
    return
  }

  try {
    if (typeof request.data === 'string') {
      const raw: unknown = JSON.parse(request.data)
      if (typeof raw === 'object' && raw !== null) {
        redactSensitiveFields(raw as Record<string, unknown>)
        request.data = JSON.stringify(raw)
      }
    } else if (typeof request.data === 'object' && request.data !== null) {
      redactSensitiveFields(request.data as Record<string, unknown>)
    }
  } catch {
    // Intentionally swallowed: cannot log inside Sentry beforeSend,
    // and throwing would lose the error event
  }
}

/**
 * Strips PII from a Sentry error event before it is sent.
 *
 * - Redacts sensitive fields (cpf, cnpj, email, phone, password, birthDate, document)
 *   from `event.request.data`
 * - Redacts `event.request.query_string` entirely
 * - Reduces `event.user` to only the `id` field
 *
 * Designed to be used as the `beforeSend` hook in Sentry.init().
 * The generic type parameter allows callers to pass the concrete Sentry ErrorEvent
 * type from their respective SDK (@sentry/nextjs or @sentry/node).
 */
export function stripPiiFromEvent<TEvent extends SentryErrorEvent>(
  event: TEvent
): TEvent {
  if (event.request) {
    redactRequestData(event.request)

    if (event.request.query_string) {
      event.request.query_string = REDACTED
    }
  }

  if (event.user) {
    event.user = { id: event.user.id }
  }

  return event
}
