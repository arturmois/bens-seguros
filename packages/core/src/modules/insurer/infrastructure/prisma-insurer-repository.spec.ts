import type { Insurer, PrismaClient } from '@repo/db'
import { describe, expect, it, vi } from 'vitest'
import { PrismaInsurerRepository } from './prisma-insurer-repository.js'

function createInsurerRow(): Insurer {
  const now = new Date('2026-04-03T00:00:00.000Z')

  return {
    id: 'insurer-1',
    organizationId: 'org-1',
    name: 'Tokio Marine',
    code: 'TOKIO',
    active: true,
    createdAt: now,
    updatedAt: now,
  }
}

describe('PrismaInsurerRepository', () => {
  it('filters insurers by name or code when search is provided', async () => {
    const findMany = vi.fn().mockResolvedValue([createInsurerRow()])
    const prisma = {
      insurer: {
        findMany,
      },
    } as unknown as PrismaClient

    const repository = new PrismaInsurerRepository(prisma)

    await repository.findMany(
      {
        organizationId: 'org-1',
        active: true,
        search: 'TOKIO',
      },
      { limit: 20 }
    )

    expect(findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        active: true,
        OR: [
          { name: { contains: 'TOKIO', mode: 'insensitive' } },
          { code: { contains: 'TOKIO', mode: 'insensitive' } },
        ],
      },
      take: 21,
      orderBy: { name: 'asc' },
    })
  })
})
