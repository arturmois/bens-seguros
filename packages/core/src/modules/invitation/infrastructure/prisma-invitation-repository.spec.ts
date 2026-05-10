import type { PrismaClient } from '@repo/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaInvitationRepository } from './prisma-invitation-repository.js'

function makePrisma() {
  const findMany = vi.fn().mockResolvedValue([])
  const count = vi.fn().mockResolvedValue(0)
  const findFirst = vi.fn().mockResolvedValue(null)
  const update = vi.fn()
  const prisma = {
    invitation: { findMany, count, findFirst, update },
  } as unknown as PrismaClient
  return { prisma, findMany, count, findFirst, update }
}

function invitationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    email: 'a@b.com',
    organizationId: 'org-1',
    role: 'COMMERCIAL',
    status: 'pending',
    expiresAt: new Date('2026-12-31'),
    inviterId: 'user-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('PrismaInvitationRepository.listPending', () => {
  let mocks: ReturnType<typeof makePrisma>
  beforeEach(() => {
    mocks = makePrisma()
  })
  it('filters by organizationId, status=pending, and non-expired', async () => {
    const repo = new PrismaInvitationRepository(mocks.prisma)
    await repo.listPending('org-1', { limit: 20 })
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: 'org-1',
        status: 'pending',
        expiresAt: { gt: expect.any(Date) },
      }),
      orderBy: { id: 'asc' },
      take: 21,
    })
    const countCall = mocks.count.mock.calls[0]?.[0]
    expect(countCall?.where).toEqual({
      organizationId: 'org-1',
      status: 'pending',
      expiresAt: { gt: expect.any(Date) },
    })
  })
  it('applies cursor as id: { gt } on findMany only (count uses base where)', async () => {
    const repo = new PrismaInvitationRepository(mocks.prisma)
    await repo.listPending('org-1', { limit: 20, cursor: 'inv-100' })
    const findManyWhere = mocks.findMany.mock.calls[0]?.[0]?.where as {
      id?: { gt: string }
    }
    expect(findManyWhere?.id).toEqual({ gt: 'inv-100' })
    const countWhere = mocks.count.mock.calls[0]?.[0]?.where as {
      id?: unknown
    }
    expect(countWhere?.id).toBeUndefined()
  })
  it('returns nextCursor when results exceed limit', async () => {
    const rows = Array.from({ length: 21 }, (_, i) =>
      invitationRow({ id: `inv-${String(i).padStart(3, '0')}` })
    )
    mocks.findMany.mockResolvedValue(rows)
    mocks.count.mockResolvedValue(50)
    const repo = new PrismaInvitationRepository(mocks.prisma)
    const result = await repo.listPending('org-1', { limit: 20 })
    expect(result.items).toHaveLength(20)
    expect(result.nextCursor).toBe('inv-019')
    expect(result.total).toBe(50)
  })
  it('returns null nextCursor when results fit within limit', async () => {
    mocks.findMany.mockResolvedValue([invitationRow()])
    mocks.count.mockResolvedValue(1)
    const repo = new PrismaInvitationRepository(mocks.prisma)
    const result = await repo.listPending('org-1', { limit: 20 })
    expect(result.nextCursor).toBeNull()
    expect(result.total).toBe(1)
  })
  it('maps row to InvitationDetail with all fields', async () => {
    mocks.findMany.mockResolvedValue([invitationRow()])
    mocks.count.mockResolvedValue(1)
    const repo = new PrismaInvitationRepository(mocks.prisma)
    const { items } = await repo.listPending('org-1', { limit: 20 })
    expect(items[0]).toEqual(invitationRow())
  })
})

describe('PrismaInvitationRepository.findByIdPublic', () => {
  function makePrismaForPublic() {
    const findUnique = vi.fn()
    const findUniqueUser = vi.fn()
    const prisma = {
      invitation: { findUnique },
      user: { findUnique: findUniqueUser },
    } as unknown as PrismaClient
    return { prisma, findUnique, findUniqueUser }
  }
  it('returns null when invitation does not exist', async () => {
    const { prisma, findUnique } = makePrismaForPublic()
    findUnique.mockResolvedValue(null)
    const repo = new PrismaInvitationRepository(prisma)
    const result = await repo.findByIdPublic('missing')
    expect(result).toBeNull()
  })
  it('joins organization, inviter and existing user; falls back inviterName to "Um membro"', async () => {
    const { prisma, findUnique, findUniqueUser } = makePrismaForPublic()
    findUnique.mockResolvedValue({
      id: 'inv-1',
      email: 'a@b.com',
      role: 'COMMERCIAL',
      status: 'pending',
      expiresAt: new Date('2026-12-31'),
      inviterId: 'user-9',
      organization: { name: 'Corretora X' },
    })
    findUniqueUser.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    const repo = new PrismaInvitationRepository(prisma)
    const result = await repo.findByIdPublic('inv-1')
    expect(result).toEqual({
      id: 'inv-1',
      email: 'a@b.com',
      role: 'COMMERCIAL',
      status: 'pending',
      expiresAt: new Date('2026-12-31'),
      organizationName: 'Corretora X',
      inviterName: 'Um membro',
      hasAccount: false,
    })
  })
  it('returns inviter name and hasAccount=true when both lookups succeed', async () => {
    const { prisma, findUnique, findUniqueUser } = makePrismaForPublic()
    findUnique.mockResolvedValue({
      id: 'inv-1',
      email: 'a@b.com',
      role: 'COMMERCIAL',
      status: 'pending',
      expiresAt: new Date(),
      inviterId: 'user-9',
      organization: { name: 'Org' },
    })
    findUniqueUser
      .mockResolvedValueOnce({ name: 'Carlos' })
      .mockResolvedValueOnce({ id: 'user-42' })
    const repo = new PrismaInvitationRepository(prisma)
    const result = await repo.findByIdPublic('inv-1')
    expect(result?.inviterName).toBe('Carlos')
    expect(result?.hasAccount).toBe(true)
  })
})

describe('PrismaInvitationRepository.cancelPending', () => {
  let mocks: ReturnType<typeof makePrisma>
  beforeEach(() => {
    mocks = makePrisma()
  })
  it('returns null when no pending invitation matches the id+org filter', async () => {
    mocks.findFirst.mockResolvedValue(null)
    const repo = new PrismaInvitationRepository(mocks.prisma)
    const result = await repo.cancelPending('inv-1', 'org-1')
    expect(result).toBeNull()
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'inv-1', organizationId: 'org-1', status: 'pending' },
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('transitions status to canceled and returns the updated record', async () => {
    mocks.findFirst.mockResolvedValue(invitationRow())
    mocks.update.mockResolvedValue(invitationRow({ status: 'canceled' }))
    const repo = new PrismaInvitationRepository(mocks.prisma)
    const result = await repo.cancelPending('inv-1', 'org-1')
    expect(result?.status).toBe('canceled')
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      data: { status: 'canceled' },
    })
  })
})
