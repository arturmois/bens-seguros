import type { PrismaClient } from '@repo/db'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrismaSearchRepository } from './prisma-search-repository.js'

function makePrisma() {
  const findManyClient = vi.fn().mockResolvedValue([])
  const findManyProposal = vi.fn().mockResolvedValue([])
  const findManyPolicy = vi.fn().mockResolvedValue([])
  const findManyClaim = vi.fn().mockResolvedValue([])
  const prisma = {
    client: { findMany: findManyClient },
    proposal: { findMany: findManyProposal },
    policy: { findMany: findManyPolicy },
    claim: { findMany: findManyClaim },
  } as unknown as PrismaClient
  return {
    prisma,
    findManyClient,
    findManyProposal,
    findManyPolicy,
    findManyClaim,
  }
}

describe('PrismaSearchRepository.globalSearch', () => {
  let mocks: ReturnType<typeof makePrisma>
  beforeEach(() => {
    mocks = makePrisma()
  })
  it('queries all 4 entities with the organizationId filter', async () => {
    const repo = new PrismaSearchRepository(mocks.prisma)
    await repo.globalSearch('org-1', 'João', 3)
    expect(mocks.findManyClient).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          deletedAt: null,
        }),
      })
    )
    expect(mocks.findManyProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          deletedAt: null,
        }),
      })
    )
    expect(mocks.findManyPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          deletedAt: null,
        }),
      })
    )
    expect(mocks.findManyClaim).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          deletedAt: null,
        }),
      })
    )
  })
  it('respects perEntityLimit on each query', async () => {
    const repo = new PrismaSearchRepository(mocks.prisma)
    await repo.globalSearch('org-1', 'test', 7)
    expect(mocks.findManyClient).toHaveBeenCalledWith(
      expect.objectContaining({ take: 7 })
    )
    expect(mocks.findManyProposal).toHaveBeenCalledWith(
      expect.objectContaining({ take: 7 })
    )
    expect(mocks.findManyPolicy).toHaveBeenCalledWith(
      expect.objectContaining({ take: 7 })
    )
    expect(mocks.findManyClaim).toHaveBeenCalledWith(
      expect.objectContaining({ take: 7 })
    )
  })
  it('adds documentHash filter to client query when input is 11+ digits', async () => {
    const repo = new PrismaSearchRepository(mocks.prisma)
    await repo.globalSearch('org-1', '12345678901', 3)
    const callArgs = mocks.findManyClient.mock.calls[0]?.[0]
    const orClauses = (callArgs?.where as { OR: unknown[] }).OR
    const hasDocumentHashClause = orClauses.some(
      (clause) =>
        typeof clause === 'object' &&
        clause !== null &&
        'documentHash' in clause
    )
    expect(hasDocumentHashClause).toBe(true)
  })
  it('omits documentHash filter when input has fewer than 11 digits', async () => {
    const repo = new PrismaSearchRepository(mocks.prisma)
    await repo.globalSearch('org-1', 'abc123', 3)
    const callArgs = mocks.findManyClient.mock.calls[0]?.[0]
    const orClauses = (callArgs?.where as { OR: unknown[] }).OR
    const hasDocumentHashClause = orClauses.some(
      (clause) =>
        typeof clause === 'object' &&
        clause !== null &&
        'documentHash' in clause
    )
    expect(hasDocumentHashClause).toBe(false)
  })
  it('adds branch filter to proposal query when input matches a branch enum', async () => {
    const repo = new PrismaSearchRepository(mocks.prisma)
    await repo.globalSearch('org-1', 'AUTO', 3)
    const callArgs = mocks.findManyProposal.mock.calls[0]?.[0]
    const orClauses = (callArgs?.where as { OR: unknown[] }).OR
    const hasBranchClause = orClauses.some(
      (clause) =>
        typeof clause === 'object' && clause !== null && 'branch' in clause
    )
    expect(hasBranchClause).toBe(true)
  })
  it('omits branch filter when input does not match a branch enum', async () => {
    const repo = new PrismaSearchRepository(mocks.prisma)
    await repo.globalSearch('org-1', 'random', 3)
    const callArgs = mocks.findManyProposal.mock.calls[0]?.[0]
    const orClauses = (callArgs?.where as { OR: unknown[] }).OR
    const hasBranchClause = orClauses.some(
      (clause) =>
        typeof clause === 'object' && clause !== null && 'branch' in clause
    )
    expect(hasBranchClause).toBe(false)
  })
  it('adds claimNumber filter to claim query when input parses as integer', async () => {
    const repo = new PrismaSearchRepository(mocks.prisma)
    await repo.globalSearch('org-1', '42', 3)
    const callArgs = mocks.findManyClaim.mock.calls[0]?.[0]
    const orClauses = (callArgs?.where as { OR: unknown[] }).OR
    const hasClaimNumberClause = orClauses.some(
      (clause) =>
        typeof clause === 'object' && clause !== null && 'claimNumber' in clause
    )
    expect(hasClaimNumberClause).toBe(true)
  })
  it('omits claimNumber filter when input is not numeric', async () => {
    const repo = new PrismaSearchRepository(mocks.prisma)
    await repo.globalSearch('org-1', 'João', 3)
    const callArgs = mocks.findManyClaim.mock.calls[0]?.[0]
    const orClauses = (callArgs?.where as { OR: unknown[] }).OR
    const hasClaimNumberClause = orClauses.some(
      (clause) =>
        typeof clause === 'object' && clause !== null && 'claimNumber' in clause
    )
    expect(hasClaimNumberClause).toBe(false)
  })
  it('maps client rows to ClientSearchHit DTO', async () => {
    mocks.findManyClient.mockResolvedValue([
      {
        id: 'client-1',
        legalName: 'João Silva',
        document: '12345678901',
      },
    ])
    const repo = new PrismaSearchRepository(mocks.prisma)
    const result = await repo.globalSearch('org-1', 'João', 3)
    expect(result.clients).toEqual([
      { id: 'client-1', name: 'João Silva', document: '12345678901' },
    ])
  })
  it('maps proposal rows to ProposalSearchHit DTO with clientName extracted', async () => {
    mocks.findManyProposal.mockResolvedValue([
      {
        id: 'prop-1',
        stage: 'CAPTURE',
        branch: 'AUTO',
        contact: { name: 'Maria' },
      },
    ])
    const repo = new PrismaSearchRepository(mocks.prisma)
    const result = await repo.globalSearch('org-1', 'maria', 3)
    expect(result.proposals).toEqual([
      { id: 'prop-1', stage: 'CAPTURE', branch: 'AUTO', clientName: 'Maria' },
    ])
  })
})
