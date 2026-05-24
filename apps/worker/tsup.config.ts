import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { worker: 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: [
    '@repo/auth',
    '@repo/core',
    '@repo/db',
    '@repo/env',
    '@repo/shared',
  ],
  external: [
    'bullmq',
    'ioredis',
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
    'prisma',
    'pino',
    'tsyringe',
    'reflect-metadata',
    'zod',
    '@t3-oss/env-core',
    'resend',
    '@aws-sdk/*',
    'file-type',
  ],
})
