import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: ['@repo/db-chat', '@repo/env', '@repo/shared'],
  external: [
    'fastify',
    '@fastify/*',
    'mongoose',
    'bullmq',
    'ioredis',
    'socket.io',
    '@socket.io/*',
    'pino',
    'zod',
  ],
})
