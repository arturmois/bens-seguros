import type { PrismaClient } from '@repo/db'
import { describe, expect, it, vi } from 'vitest'
import { PrismaMemberRepository } from './prisma-member-repository.js'

function makePrismaWithMembers(
  rows: ReadonlyArray<{
    id: string
    userId: string
    organizationId: string
    role: string
    active: boolean
    organization: {
      id: string
      name: string
      slug: string
      logo: string | null
    }
  }>
) {
  const findMany = vi.fn().mockResolvedValue(rows)
  const prisma = {
    member: { findMany },
  } as unknown as PrismaClient
  return { prisma, findMany }
}

describe('PrismaMemberRepository.listOrganizationsForUser', () => {
  it('returns OrganizationMembership entries for active memberships only', async () => {
    const { prisma, findMany } = makePrismaWithMembers([
      {
        id: 'member-1',
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'OWNER',
        active: true,
        organization: {
          id: 'org-1',
          name: 'Org One',
          slug: 'org-one',
          logo: null,
        },
      },
    ])
    const repo = new PrismaMemberRepository(prisma)
    const result = await repo.listOrganizationsForUser('user-1')
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', active: true },
      include: { organization: true },
    })
    expect(result).toEqual([
      {
        id: 'org-1',
        name: 'Org One',
        slug: 'org-one',
        logo: null,
        role: 'OWNER',
      },
    ])
  })
  it('returns empty array when user has no active memberships', async () => {
    const { prisma } = makePrismaWithMembers([])
    const repo = new PrismaMemberRepository(prisma)
    const result = await repo.listOrganizationsForUser('user-2')
    expect(result).toEqual([])
  })
  it('preserves logo URL when present', async () => {
    const { prisma } = makePrismaWithMembers([
      {
        id: 'member-2',
        userId: 'user-3',
        organizationId: 'org-2',
        role: 'ADMIN',
        active: true,
        organization: {
          id: 'org-2',
          name: 'Org Two',
          slug: 'org-two',
          logo: 'organizations/org-2/logo.png',
        },
      },
    ])
    const repo = new PrismaMemberRepository(prisma)
    const [first] = await repo.listOrganizationsForUser('user-3')
    expect(first?.logo).toBe('organizations/org-2/logo.png')
  })
})

describe('PrismaMemberRepository.listActive', () => {
  function makePrismaListActive(rows: ReadonlyArray<unknown>, total = 0) {
    const findMany = vi.fn().mockResolvedValue(rows)
    const count = vi.fn().mockResolvedValue(total)
    const prisma = {
      member: { findMany, count },
    } as unknown as import('@repo/db').PrismaClient
    return { prisma, findMany, count }
  }
  function memberRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'member-1',
      userId: 'user-1',
      role: 'OWNER',
      active: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      user: { name: 'Carlos', email: 'carlos@user.com' },
      ...overrides,
    }
  }
  it('filters by organizationId + active and joins user', async () => {
    const { prisma, findMany, count } = makePrismaListActive([memberRow()], 1)
    const repo = new PrismaMemberRepository(prisma)
    const result = await repo.listActive('org-1', { limit: 50 })
    expect(findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', active: true },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { id: 'asc' },
      take: 51,
    })
    expect(count).toHaveBeenCalledWith({
      where: { organizationId: 'org-1', active: true },
    })
    expect(result.total).toBe(1)
    expect(result.nextCursor).toBeNull()
    expect(result.items[0]).toEqual({
      id: 'member-1',
      userId: 'user-1',
      name: 'Carlos',
      email: 'carlos@user.com',
      role: 'OWNER',
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })
  it('applies cursor as id: { gt } when provided', async () => {
    const { prisma, findMany } = makePrismaListActive([], 0)
    const repo = new PrismaMemberRepository(prisma)
    await repo.listActive('org-1', { limit: 50, cursor: 'member-100' })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: 'org-1',
          active: true,
          id: { gt: 'member-100' },
        },
      })
    )
  })
  it('returns nextCursor when results exceed limit', async () => {
    const rows = Array.from({ length: 51 }, (_, i) =>
      memberRow({ id: `member-${String(i).padStart(3, '0')}` })
    )
    const { prisma } = makePrismaListActive(rows, 100)
    const repo = new PrismaMemberRepository(prisma)
    const result = await repo.listActive('org-1', { limit: 50 })
    expect(result.items).toHaveLength(50)
    expect(result.nextCursor).toBe('member-049')
    expect(result.total).toBe(100)
  })
  it('returns null nextCursor when results fit within limit', async () => {
    const { prisma } = makePrismaListActive([memberRow()], 1)
    const repo = new PrismaMemberRepository(prisma)
    const result = await repo.listActive('org-1', { limit: 50 })
    expect(result.nextCursor).toBeNull()
  })
})
