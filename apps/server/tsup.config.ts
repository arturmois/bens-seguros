import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    server: 'src/server.ts',
  },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: [
    '@repo/core',
    '@repo/db',
    '@repo/env',
    '@repo/shared',
    '@repo/auth',
  ],
  external: [
    'fastify',
    '@fastify/*',
    '@prisma/client',
    'prisma',
    'bullmq',
    'ioredis',
    'socket.io',
    'pino',
    'better-auth',
    '@casl/*',
    'tsyringe',
    'reflect-metadata',
    'zod',
  ],
});
