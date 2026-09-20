import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type { CursorPage, Page } from '../../../shared/pagination.js'
import type {
  EndorsementRepository,
  EndorsementData,
  EndorsementFilters,
  CreateEndorsementInput,
} from '../domain/endorsement-repository.js'
import { EndorsementMapper } from './endorsement-mapper.js'

const ENDORSEMENT_INCLUDE = {
  policy: { select: { policyNumber: true } },
} satisfies Prisma.EndorsementInclude

@injectable()
export class PrismaEndorsementRepository implements EndorsementRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateEndorsementInput): Promise<EndorsementData> {
    const row = await this.prisma.endorsement.create({
      data: {
        organizationId: data.organizationId,
        policyId: data.policyId,
        type: data.type,
        description: data.description,
        effectiveDate: data.effectiveDate,
        previousVersionSnapshot: data.previousVersionSnapshot,
        changes: data.changes,
        createdBy: data.createdBy ?? null,
      },
      include: ENDORSEMENT_INCLUDE,
    })
    return EndorsementMapper.toDomain(row)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<EndorsementData | null> {
    const row = await this.prisma.endorsement.findFirst({
      where: { id, organizationId },
      include: ENDORSEMENT_INCLUDE,
    })
    return row ? EndorsementMapper.toDomain(row) : null
  }

  async findMany(
    filters: EndorsementFilters,
    page: CursorPage
  ): Promise<Page<EndorsementData>> {
    const where: Prisma.EndorsementWhereInput = {
      organizationId: filters.organizationId,
      ...(filters.policyId && { policyId: filters.policyId }),
    }
    const rows = await this.prisma.endorsement.findMany({
      where,
      include: ENDORSEMENT_INCLUDE,
      take: page.limit + 1,
      ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows
    return {
      items: items.map(EndorsementMapper.toDomain),
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }
}
