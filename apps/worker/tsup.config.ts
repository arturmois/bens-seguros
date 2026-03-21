import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: ['@repo/core', '@repo/db', '@repo/env'],
  external: ['bullmq', 'ioredis', '@prisma/client', 'prisma', 'pino', 'tsyringe', 'reflect-metadata', 'zod'],
});
