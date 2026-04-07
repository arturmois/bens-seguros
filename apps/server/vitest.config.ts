import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
    },
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      MONGODB_URL: 'mongodb://localhost:27017/test',
      AUTH_SECRET: 'test-auth-secret-at-least-32-chars!!',
      SOCKET_JWT_SECRET: 'test-socket-secret-16',
      ENCRYPTION_KEY: 'a'.repeat(64),
    },
  },
})
