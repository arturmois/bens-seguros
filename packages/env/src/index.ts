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
    MONGODB_URL: z.string().url(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    AUTH_SECRET: z.string().min(32),
    SOCKET_JWT_SECRET: z.string().min(16),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    API_URL: z.string().url().default('http://localhost:3001'),
    CHAT_SERVER_URL: z.string().url().default('http://localhost:3002'),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().default('bens-seguros'),
    R2_PUBLIC_URL: z.string().url().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_ADDRESS: z
      .string()
      .default('Bens Seguros <noreply@bens.com.br>'),
    SENTRY_DSN: z.string().url().optional(),
    COOKIE_DOMAIN: z.string().optional(),
    META_APP_SECRET: z.string().optional(),
    META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
    META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
    // SEC-1: PII encryption key — hex-encoded 32-byte key (64 hex chars)
    // Optional for now (demo phase); will be required before onboarding real clients
    ENCRYPTION_KEY: encryptionKeySchema.default('0'.repeat(64)),
    // Internal API for lead capture from AI bot
    INTERNAL_API_URL: z.string().url().optional(),
    INTERNAL_API_SECRET: z
      .string()
      .min(32, 'INTERNAL_API_SECRET must be at least 32 characters')
      .optional(),
  },
  clientPrefix: 'NEXT_PUBLIC_',
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
    NEXT_PUBLIC_CHAT_SERVER_URL: z
      .string()
      .url()
      .default('http://localhost:3002'),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
