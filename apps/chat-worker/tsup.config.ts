import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: ['@repo/db-chat', '@repo/env', '@repo/shared', '@repo/ai'],
  external: ['bullmq', 'ioredis', 'mongoose', 'baileys', 'pino', 'zod'],
});
