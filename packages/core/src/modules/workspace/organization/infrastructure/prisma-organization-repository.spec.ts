import type { PrismaClient } from '@repo/db'
import { describe, expect, it, vi } from 'vitest'
import { OrganizationNotFoundError } from '../domain/organization-errors.js'
import { PrismaOrganizationRepository } from './prisma-organization-repository.js'

function makePrisma() {
  const findUnique = vi.fn()
  const findFirst = vi.fn()
  const update = vi.fn()
  const prisma = {
    organization: { findUnique, findFirst, update },
  } as unknown as PrismaClient
  return { prisma, findUnique, findFirst, update }
}

describe('PrismaOrganizationRepository', () => {
  describe('slugTakenByAnother', () => {
    it('queries with explicit cross-tenant exclusion of the current org', async () => {
      const { prisma, findFirst } = makePrisma()
      findFirst.mockResolvedValue(null)
      const repo = new PrismaOrganizationRepository(prisma)
      await repo.slugTakenByAnother('org-1', 'my-slug')
      expect(findFirst).toHaveBeenCalledWith({
        where: { slug: 'my-slug', id: { not: 'org-1' } },
        select: { id: true },
      })
    })
    it('returns true when another org has the slug', async () => {
      const { prisma, findFirst } = makePrisma()
      findFirst.mockResolvedValue({ id: 'org-2' })
      const repo = new PrismaOrganizationRepository(prisma)
      const taken = await repo.slugTakenByAnother('org-1', 'my-slug')
      expect(taken).toBe(true)
    })
    it('returns false when no other org has the slug', async () => {
      const { prisma, findFirst } = makePrisma()
      findFirst.mockResolvedValue(null)
      const repo = new PrismaOrganizationRepository(prisma)
      const taken = await repo.slugTakenByAnother('org-1', 'my-slug')
      expect(taken).toBe(false)
    })
  })
  describe('getCurrentLogo', () => {
    it('returns the logo key when the organization exists', async () => {
      const { prisma, findUnique } = makePrisma()
      findUnique.mockResolvedValue({ logo: 'organizations/org-1/logo.png' })
      const repo = new PrismaOrganizationRepository(prisma)
      const logo = await repo.getCurrentLogo('org-1')
      expect(logo).toBe('organizations/org-1/logo.png')
    })
    it('returns null when logo is not set', async () => {
      const { prisma, findUnique } = makePrisma()
      findUnique.mockResolvedValue({ logo: null })
      const repo = new PrismaOrganizationRepository(prisma)
      const logo = await repo.getCurrentLogo('org-1')
      expect(logo).toBeNull()
    })
    it('throws OrganizationNotFoundError when the organization does not exist', async () => {
      const { prisma, findUnique } = makePrisma()
      findUnique.mockResolvedValue(null)
      const repo = new PrismaOrganizationRepository(prisma)
      await expect(repo.getCurrentLogo('missing')).rejects.toBeInstanceOf(
        OrganizationNotFoundError
      )
    })
  })
  describe('findById', () => {
    it('returns the row when the organization exists', async () => {
      const { prisma, findUnique } = makePrisma()
      const now = new Date('2026-01-01T00:00:00.000Z')
      findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Corretora',
        slug: 'corretora',
        logo: null,
        createdAt: now,
      })
      const repo = new PrismaOrganizationRepository(prisma)
      const result = await repo.findById('org-1')
      expect(result).toEqual({
        id: 'org-1',
        name: 'Corretora',
        slug: 'corretora',
        logo: null,
        createdAt: now,
      })
    })
    it('returns null when the organization does not exist', async () => {
      const { prisma, findUnique } = makePrisma()
      findUnique.mockResolvedValue(null)
      const repo = new PrismaOrganizationRepository(prisma)
      const result = await repo.findById('missing')
      expect(result).toBeNull()
    })
  })
})
