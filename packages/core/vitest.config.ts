import { defineConfig } from 'vitest/config'

const unitEnv = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  MONGODB_URL: 'mongodb://localhost:27017/test',
  AUTH_SECRET: 'test-auth-secret-at-least-32-chars!!',
  SOCKET_JWT_SECRET: 'test-socket-secret-16',
  ENCRYPTION_KEY: 'a'.repeat(64),
}

const dbEnv = {
  ...unitEnv,
  DATABASE_URL: 'postgresql://app_user:bens_app@localhost:5432/bens_seguros',
  DATABASE_ADMIN_URL: 'postgresql://bens:bens_dev@localhost:5432/bens_seguros',
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['reflect-metadata'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
          exclude: ['**/*.db.spec.ts'],
          env: unitEnv,
        },
      },
      {
        extends: true,
        test: {
          name: 'core:db',
          include: ['**/*.db.spec.ts'],
          setupFiles: ['reflect-metadata', './test/db-harness.ts'],
          env: dbEnv,
        },
      },
    ],
  },
})
