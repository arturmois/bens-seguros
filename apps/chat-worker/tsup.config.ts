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
    '@repo/ai',
    '@repo/core',
    '@repo/db',
    '@repo/db-chat',
    '@repo/env',
    '@repo/shared',
  ],
  external: [
    'bullmq',
    'ioredis',
    'mongoose',
    'baileys',
    'pino',
    'zod',
    'reflect-metadata',
    'tsyringe',
    'debug',
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
    'prisma',
  ],
})
