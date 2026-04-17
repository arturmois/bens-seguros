import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type { Redis } from 'ioredis'
import { inject, injectable } from 'tsyringe'
import type {
  CursorPage,
  Page,
  SortOrder,
} from '../../client/domain/client-repository.js'
import type {
  ClaimData,
  ClaimFilters,
  ClaimRepository,
  ClaimSortField,
  CreateClaimInput,
  UpdateClaimStatusInput,
} from '../domain/claim-repository.js'
import { ClaimMapper } from './claim-mapper.js'

function buildOrderBy(
  sortBy: ClaimSortField | undefined,
  sortOrder: SortOrder | undefined
): Prisma.ClaimOrderByWithRelationInput[] {
  const order = sortOrder === 'asc' ? 'asc' : 'desc'
  const field = sortBy ?? 'createdAt'
  return [{ [field]: order }, { id: 'desc' }]
}

const CLAIM_INCLUDE = {
  policy: { select: { policyNumber: true } },
  client: { select: { name: true } },
  insurer: { select: { name: true } },
  assignedTo: { select: { name: true } },
} satisfies Prisma.ClaimInclude

const CLAIM_SEQ_KEY_PREFIX = 'claim:seq:'

@injectable()
export class PrismaClaimRepository implements ClaimRepository {
  constructor(
    @inject('PrismaClient') private readonly prisma: PrismaClient,
    private readonly redis: Redis | null = null
  ) {}

  private async getNextViaRedis(organizationId: string): Promise<number> {
    const key = `${CLAIM_SEQ_KEY_PREFIX}${organizationId}`

    // INCR is atomic — creates the key at 0 then increments to 1 if missing
    const next = await this.redis!.incr(key)

    // If result is 1, the key was just created; initialize from DB to avoid gaps
    if (next === 1) {
      const aggregate = await this.prisma.claim.aggregate({
        where: { organizationId },
        _max: { claimNumber: true },
      })
      const currentMax = aggregate._max.claimNumber ?? 0
      if (currentMax > 0) {
        // Reset to currentMax so the next INCR returns currentMax + 1
        await this.redis!.set(key, String(currentMax))
        return this.redis!.incr(key)
      }
      // No existing claims — 1 is the correct first number
    }

    return next
  }

  private async getNextViaAggregate(organizationId: string): Promise<number> {
    const aggregate = await this.prisma.claim.aggregate({
      where: { organizationId },
      _max: { claimNumber: true },
    })
    return (aggregate._max.claimNumber ?? 0) + 1
  }

  private async getNextClaimNumber(organizationId: string): Promise<number> {
    if (this.redis !== null) {
      try {
        return await this.getNextViaRedis(organizationId)
      } catch {
        return this.getNextViaAggregate(organizationId)
      }
    }
    return this.getNextViaAggregate(organizationId)
  }

  async create(data: CreateClaimInput): Promise<ClaimData> {
    const nextNumber = await this.getNextClaimNumber(data.organizationId)

    const row = await this.prisma.claim.create({
      data: {
        organizationId: data.organizationId,
        claimNumber: nextNumber,
        policyId: data.policyId,
        clientId: data.clientId,
        insurerId: data.insurerId ?? null,
        assignedToId: data.assignedToId ?? null,
        priority: data.priority ?? 'NORMAL',
        description: data.description,
        estimatedValueInCents: data.estimatedValueInCents ?? null,
        incidentDate: data.incidentDate ?? null,
        incidentLocation: data.incidentLocation ?? null,
      },
      include: CLAIM_INCLUDE,
    })

    return ClaimMapper.toDomain(row)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<ClaimData | null> {
    const row = await this.prisma.claim.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: CLAIM_INCLUDE,
    })
    return row ? ClaimMapper.toDomain(row) : null
  }

  async findMany(
    filters: ClaimFilters,
    page: CursorPage<ClaimSortField>
  ): Promise<Page<ClaimData>> {
    const statusWhere: Prisma.ClaimWhereInput =
      filters.statusGroup === 'open'
        ? { status: { notIn: ['COMPLETED', 'REJECTED'] } }
        : filters.statusGroup === 'closed'
          ? { status: { in: ['COMPLETED', 'REJECTED'] } }
          : filters.status
            ? { status: filters.status }
            : {}

    const where: Prisma.ClaimWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...statusWhere,
      ...(filters.priority && { priority: filters.priority }),
      ...(filters.policyId && { policyId: filters.policyId }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.search && {
        OR: [
          { description: { contains: filters.search, mode: 'insensitive' } },
          {
            incidentLocation: { contains: filters.search, mode: 'insensitive' },
          },
        ],
      }),
    }

    const [rows, total] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        include: CLAIM_INCLUDE,
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
        orderBy: buildOrderBy(page.sortBy, page.sortOrder),
      }),
      this.prisma.claim.count({ where }),
    ])

    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows

    return {
      items: items.map(ClaimMapper.toDomain),
      total,
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }

  async updateStatus(
    id: string,
    organizationId: string,
    data: UpdateClaimStatusInput
  ): Promise<ClaimData> {
    const row = await this.prisma.claim.update({
      where: { id, organizationId },
      data: {
        status: data.status,
        ...(data.resolvedAt && { resolvedAt: data.resolvedAt }),
        ...(data.closedAt && { closedAt: data.closedAt }),
      },
      include: CLAIM_INCLUDE,
    })

    return ClaimMapper.toDomain(row)
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.prisma.claim.update({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    })
  }
}
