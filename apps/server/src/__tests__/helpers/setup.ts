import { vi } from 'vitest'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return { ...mod, container: { resolve: vi.fn() } }
})

vi.mock('../../middlewares/ability-middleware.js', () => ({
  requireAbility: () => async () => {},
}))

vi.mock('../../services/audit-logger.js', () => ({
  auditCreate: vi.fn(),
  auditUpdate: vi.fn(),
  auditDelete: vi.fn(),
  auditApprove: vi.fn(),
  auditReject: vi.fn(),
}))
