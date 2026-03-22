import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

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
    META_WHATSAPP_TOKEN: z.string().optional(),
    META_WHATSAPP_VERIFY_TOKEN: z.string().optional(),
    META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
    // SEC-1: PII encryption key (see SECURITY-SPEC.md)
    ENCRYPTION_KEY: z.string().min(32).optional(),
  },
  clientPrefix: 'NEXT_PUBLIC_',
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
    NEXT_PUBLIC_CHAT_SERVER_URL: z
      .string()
      .url()
      .default('http://localhost:3002'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
