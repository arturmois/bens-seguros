/** Minimal logger interface compatible with both Pino Logger and FastifyBaseLogger */
export interface AppLogger {
  info(msg: string): void
  info(obj: Record<string, unknown>, msg: string): void
  error(msg: string): void
  error(obj: Record<string, unknown>, msg: string): void
  warn(msg: string): void
  warn(obj: Record<string, unknown>, msg: string): void
  debug(msg: string): void
  debug(obj: Record<string, unknown>, msg: string): void
  fatal(msg: string): void
  fatal(obj: Record<string, unknown>, msg: string): void
}

/** PII redaction paths for Pino loggers */
export const PII_REDACT_PATHS = [
  'cpf',
  'cnpj',
  'email',
  'phone',
  'password',
  'token',
  'birthDate',
  'document',
  'req.body.cpf',
  'req.body.cnpj',
  'req.body.email',
  'req.body.phone',
  'req.body.password',
  'req.body.document',
  'req.headers.authorization',
  'req.headers.cookie',
] as const

/** Pino redact configuration to protect PII in logs */
export const PINO_REDACT_CONFIG: { paths: string[]; censor: string } = {
  paths: [...PII_REDACT_PATHS],
  censor: '[REDACTED]',
}
