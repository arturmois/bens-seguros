import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const encryptionKeySchema = z
  .string()
  .length(64, 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
  .regex(/^[0-9a-f]+$/i, 'ENCRYPTION_KEY must be hex-encoded')

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DATABASE_URL: z.string().url(),
    DATABASE_ADMIN_URL: z.string().url().optional(),
    MONGODB_URL: z.string().url(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    AUTH_SECRET: z.string().min(32),
    SOCKET_JWT_SECRET: z.string().min(16),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    API_URL: z.string().url().default('http://localhost:3001'),
    CHAT_SERVER_URL: z.string().url().default('http://localhost:3002'),
    CHAT_WEBHOOK_PUBLIC_URL: z.string().url().optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().default('bens-seguros'),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_ADDRESS: z
      .string()
      .default('Bens Seguros <noreply@bensseg.com>'),
    SENTRY_DSN: z.string().url().optional(),
    COOKIE_DOMAIN: z.string().optional(),
    META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
    META_APP_ID: z.string().min(1).optional(),
    META_APP_SECRET: z.string().min(1).optional(),
    META_OAUTH_REDIRECT_URI: z.string().url().optional(),
    META_WA_CONFIG_ID: z.string().optional(),
    STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
    ENCRYPTION_KEY: encryptionKeySchema,
    HMAC_KEY: z
      .string()
      .min(32, 'HMAC_KEY must be at least 32 characters')
      .optional(),
    INTERNAL_API_URL: z.string().url().optional(),
    INTERNAL_API_SECRET: z
      .string()
      .min(32, 'INTERNAL_API_SECRET must be at least 32 characters')
      .optional(),
    PORT: z.coerce.number().int().positive().optional(),
    HOST: z.string().default('0.0.0.0'),
    WIDGET_DIST_PATH: z.string().optional(),
    BAILEYS_SESSIONS_DIR: z.string().default('./baileys-sessions'),
    BAILEYS_LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('warn'),
    CONSULTAR_PLACA_EMAIL: z.string().email().optional(),
    CONSULTAR_PLACA_API_KEY: z.string().min(1).optional(),
    MAX_ORGS_PER_USER: z.coerce.number().int().positive().default(3),
    SIGNUP_MODE: z.enum(['closed', 'self_serve']).default('self_serve'),
  },
  clientPrefix: 'NEXT_PUBLIC_',
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
    NEXT_PUBLIC_CHAT_SERVER_URL: z
      .string()
      .url()
      .default('http://localhost:3002'),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
    NEXT_PUBLIC_META_APP_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_META_WA_CONFIG_ID: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
