import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMember = vi.fn()
const prismaUser = vi.fn()
const adminMember = vi.fn()
const adminUser = vi.fn()

vi.mock('@repo/db', () => ({
  prisma: {
    member: { findUnique: (...args: unknown[]) => prismaMember(...args) },
    user: { findUnique: (...args: unknown[]) => prismaUser(...args) },
  },
  prismaAdmin: {
    member: { findUnique: (...args: unknown[]) => adminMember(...args) },
    user: { findUnique: (...args: unknown[]) => adminUser(...args) },
  },
}))

const { resolveMembership, userStatus } = await import(
  '../workspace-queries.js'
)

describe('workspace queries client choice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMember.mockResolvedValue({ role: 'ADMIN', active: true })
    prismaUser.mockResolvedValue({ isSuperAdmin: true, twoFactorEnabled: true })
  })

  it('resolves membership on prisma, not prismaAdmin', async () => {
    await resolveMembership.execute({
      userId: 'user-1',
      organizationId: 'org-1',
    })
    expect(prismaMember).toHaveBeenCalledTimes(1)
    expect(adminMember).not.toHaveBeenCalled()
  })

  it('reads isSuperAdmin on prisma, not prismaAdmin', async () => {
    await userStatus.isSuperAdmin('user-1')
    expect(prismaUser).toHaveBeenCalledTimes(1)
    expect(adminUser).not.toHaveBeenCalled()
  })

  it('reads twoFactorEnabled on prisma, not prismaAdmin', async () => {
    await userStatus.hasTwoFactorEnabled('user-1')
    expect(prismaUser).toHaveBeenCalledTimes(1)
    expect(adminUser).not.toHaveBeenCalled()
  })
})
