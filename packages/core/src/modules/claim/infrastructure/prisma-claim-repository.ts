import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type { CursorPage, Page } from '../../client/domain/client-repository.js'
import type {
  ClaimRepository,
  ClaimData,
  ClaimFilters,
  CreateClaimInput,
  UpdateClaimStatusInput,
} from '../domain/claim-repository.js'
import { ClaimMapper } from './claim-mapper.js'

const CLAIM_INCLUDE = {
  policy: { select: { policyNumber: true } },
  client: { select: { name: true } },
  insurer: { select: { name: true } },
  assignedTo: { select: { name: true } },
} satisfies Prisma.ClaimInclude

@injectable()
export class PrismaClaimRepository implements ClaimRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateClaimInput): Promise<ClaimData> {
    const row = await this.prisma.$transaction(async (tx) => {
      const aggregate = await tx.claim.aggregate({
        where: { organizationId: data.organizationId },
        _max: { claimNumber: true },
      })

      const nextNumber = (aggregate._max.claimNumber ?? 0) + 1

      return tx.claim.create({
        data: {
          organizationId: data.organizationId,
          claimNumber: nextNumber,
          policyId: data.policyId,
          clientId: data.clientId,
          insurerId: data.insurerId ?? null,
          assignedToId: data.assignedToId ?? null,
          priority: data.priority ?? 'NORMAL',
          description: data.description,
          incidentDate: data.incidentDate ?? null,
          incidentLocation: data.incidentLocation ?? null,
        },
        include: CLAIM_INCLUDE,
      })
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
    page: CursorPage
  ): Promise<Page<ClaimData>> {
    const where: Prisma.ClaimWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
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
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
