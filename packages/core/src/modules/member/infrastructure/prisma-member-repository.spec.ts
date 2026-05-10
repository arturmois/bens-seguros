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
