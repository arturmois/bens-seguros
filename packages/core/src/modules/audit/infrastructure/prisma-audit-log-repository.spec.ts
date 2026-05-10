import type { AuditLog, PrismaClient } from '@repo/db'
import { describe, expect, it, vi } from 'vitest'
import { PrismaAuditLogRepository } from './prisma-audit-log-repository.js'

function createAuditLogRow(overrides: Partial<AuditLog> = {}): AuditLog {
  const now = new Date('2026-05-09T00:00:00.000Z')
  return {
    id: 'audit-1',
    organizationId: 'org-1',
    userId: 'user-1',
    action: 'CREATE',
    entityType: 'Client',
    entityId: 'client-1',
    before: null,
    after: null,
    ipAddress: null,
    userAgent: null,
    createdAt: now,
    ...overrides,
  }
}

function makePrisma(rows: AuditLog[], total: number) {
  const findMany = vi.fn().mockResolvedValue(rows)
  const count = vi.fn().mockResolvedValue(total)
  const prisma = {
    auditLog: { findMany, count },
  } as unknown as PrismaClient
  return { prisma, findMany, count }
}

describe('PrismaAuditLogRepository', () => {
  it('always scopes the query by organizationId', async () => {
    const { prisma, findMany, count } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    await repo.list({ organizationId: 'org-1' }, { limit: 30 })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      })
    )
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1' }),
      })
    )
  })
  it('prefers entityTypeIn over entityType when both are provided', async () => {
    const { prisma, findMany } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    await repo.list(
      {
        organizationId: 'org-1',
        entityType: 'Client',
        entityTypeIn: ['Client', 'Proposal'],
      },
      { limit: 30 }
    )
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entityType: { in: ['Client', 'Proposal'] },
        }),
      })
    )
  })
  it('falls back to single entityType when entityTypeIn is empty', async () => {
    const { prisma, findMany } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    await repo.list(
      {
        organizationId: 'org-1',
        entityType: 'Client',
        entityTypeIn: [],
      },
      { limit: 30 }
    )
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entityType: 'Client' }),
      })
    )
  })
  it('prefers actionIn over action when both are provided', async () => {
    const { prisma, findMany } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    await repo.list(
      {
        organizationId: 'org-1',
        action: 'CREATE',
        actionIn: ['CREATE', 'UPDATE'],
      },
      { limit: 30 }
    )
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: { in: ['CREATE', 'UPDATE'] },
        }),
      })
    )
  })
  it('falls back to single action when actionIn is empty', async () => {
    const { prisma, findMany } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    await repo.list(
      { organizationId: 'org-1', action: 'CREATE', actionIn: [] },
      { limit: 30 }
    )
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'CREATE' }),
      })
    )
  })
  it('filters by userId when provided', async () => {
    const { prisma, findMany } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    await repo.list(
      { organizationId: 'org-1', userId: 'user-42' },
      { limit: 30 }
    )
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-42' }),
      })
    )
  })
  it('builds open-ended createdAt range when only dateFrom is provided', async () => {
    const { prisma, findMany } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    const dateFrom = new Date('2026-05-01T00:00:00.000Z')
    await repo.list({ organizationId: 'org-1', dateFrom }, { limit: 30 })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdAt: { gte: dateFrom } }),
      })
    )
  })
  it('builds open-ended createdAt range when only dateTo is provided', async () => {
    const { prisma, findMany } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    const dateTo = new Date('2026-05-09T23:59:59.999Z')
    await repo.list({ organizationId: 'org-1', dateTo }, { limit: 30 })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdAt: { lte: dateTo } }),
      })
    )
  })
  it('preserves non-null before/after Json values via toDomain', async () => {
    const before = { stage: 'CAPTURE' }
    const after = { stage: 'QUOTE' }
    const rows = [
      createAuditLogRow({
        before: before as never,
        after: after as never,
      }),
    ]
    const { prisma } = makePrisma(rows, 1)
    const repo = new PrismaAuditLogRepository(prisma)
    const result = await repo.list({ organizationId: 'org-1' }, { limit: 30 })
    expect(result.items[0]?.before).toEqual(before)
    expect(result.items[0]?.after).toEqual(after)
  })
  it('builds createdAt range when dateFrom and dateTo are provided', async () => {
    const { prisma, findMany } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    const dateFrom = new Date('2026-05-01T00:00:00.000Z')
    const dateTo = new Date('2026-05-09T23:59:59.999Z')
    await repo.list(
      { organizationId: 'org-1', dateFrom, dateTo },
      { limit: 30 }
    )
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: dateFrom, lte: dateTo },
        }),
      })
    )
  })
  it('returns nextCursor when results exceed limit', async () => {
    const rows = Array.from({ length: 31 }, (_, i) =>
      createAuditLogRow({ id: `audit-${String(i).padStart(3, '0')}` })
    )
    const { prisma } = makePrisma(rows, 100)
    const repo = new PrismaAuditLogRepository(prisma)
    const result = await repo.list({ organizationId: 'org-1' }, { limit: 30 })
    expect(result.items).toHaveLength(30)
    expect(result.nextCursor).toBe('audit-029')
    expect(result.total).toBe(100)
  })
  it('returns null nextCursor when results fit within limit', async () => {
    const rows = [createAuditLogRow()]
    const { prisma } = makePrisma(rows, 1)
    const repo = new PrismaAuditLogRepository(prisma)
    const result = await repo.list({ organizationId: 'org-1' }, { limit: 30 })
    expect(result.items).toHaveLength(1)
    expect(result.nextCursor).toBeNull()
    expect(result.total).toBe(1)
  })
  it('applies cursor pagination when cursor is provided', async () => {
    const { prisma, findMany } = makePrisma([], 0)
    const repo = new PrismaAuditLogRepository(prisma)
    await repo.list(
      { organizationId: 'org-1' },
      { limit: 30, cursor: 'audit-100' }
    )
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'audit-100' },
        skip: 1,
      })
    )
  })
})
