import { vi } from 'vitest'

// Mock DI container — use cases are stubbed per test
vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return { ...mod, container: { resolve: vi.fn() } }
})

// Mock ability middleware — RBAC tested in packages/auth/abilities.spec.ts
vi.mock('../../middlewares/ability-middleware.js', () => ({
  requireAbility: () => async () => {},
}))

// Mock audit logger — fire-and-forget, not handler logic
vi.mock('../../services/audit-logger.js', () => ({
  auditCreate: vi.fn(),
  auditUpdate: vi.fn(),
  auditDelete: vi.fn(),
  auditApprove: vi.fn(),
  auditReject: vi.fn(),
}))
