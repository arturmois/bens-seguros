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
