import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type {
  CursorPage,
  Page,
  SortOrder,
} from '../../../../shared/pagination.js'
import type {
  AssistanceRepository,
  AssistanceData,
  AssistanceFilters,
  AssistanceSortField,
  CreateAssistanceInput,
  UpdateAssistanceStatusInput,
} from '../domain/assistance-repository.js'
import { AssistanceMapper } from './assistance-mapper.js'

function buildOrderBy(
  sortBy: AssistanceSortField | undefined,
  sortOrder: SortOrder | undefined
): Prisma.AssistanceOrderByWithRelationInput[] {
  const order = sortOrder === 'asc' ? 'asc' : 'desc'
  const field = sortBy ?? 'createdAt'
  return [{ [field]: order }, { id: 'desc' }]
}

const ASSISTANCE_INCLUDE = {
  policy: { select: { policyNumber: true } },
  client: { select: { legalName: true } },
} satisfies Prisma.AssistanceInclude

@injectable()
export class PrismaAssistanceRepository implements AssistanceRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateAssistanceInput): Promise<AssistanceData> {
    const row = await this.prisma.assistance.create({
      data: {
        organizationId: data.organizationId,
        policyId: data.policyId,
        clientId: data.clientId,
        claimId: data.claimId ?? null,
        type: data.type,
        description: data.description ?? null,
        address: data.address ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        providerName: data.providerName ?? null,
        providerPhone: data.providerPhone ?? null,
        scheduledAt: data.scheduledAt ?? null,
      },
      include: ASSISTANCE_INCLUDE,
    })
    return AssistanceMapper.toDomain(row)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<AssistanceData | null> {
    const row = await this.prisma.assistance.findFirst({
      where: { id, organizationId },
      include: ASSISTANCE_INCLUDE,
    })
    return row ? AssistanceMapper.toDomain(row) : null
  }

  async findMany(
    filters: AssistanceFilters,
    page: CursorPage<AssistanceSortField>
  ): Promise<Page<AssistanceData>> {
    const statusWhere: Prisma.AssistanceWhereInput =
      filters.statusIn && filters.statusIn.length > 0
        ? { status: { in: [...filters.statusIn] } }
        : filters.statusGroup === 'open'
          ? { status: { not: 'COMPLETED' } }
          : filters.statusGroup === 'closed'
            ? { status: 'COMPLETED' }
            : filters.status
              ? { status: filters.status }
              : {}
    const where: Prisma.AssistanceWhereInput = {
      organizationId: filters.organizationId,
      ...statusWhere,
      ...(filters.policyId && { policyId: filters.policyId }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.typeIn?.length
        ? { type: { in: [...filters.typeIn] } }
        : filters.type && { type: filters.type }),
      ...(filters.search && {
        OR: [
          { description: { contains: filters.search, mode: 'insensitive' } },
          { providerName: { contains: filters.search, mode: 'insensitive' } },
          { address: { contains: filters.search, mode: 'insensitive' } },
          { type: { contains: filters.search, mode: 'insensitive' } },
          {
            client: {
              legalName: { contains: filters.search, mode: 'insensitive' },
            },
          },
        ],
      }),
    }
    const [rows, total] = await Promise.all([
      this.prisma.assistance.findMany({
        where,
        include: ASSISTANCE_INCLUDE,
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
        orderBy: buildOrderBy(page.sortBy, page.sortOrder),
      }),
      this.prisma.assistance.count({ where }),
    ])
    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows
    return {
      items: items.map(AssistanceMapper.toDomain),
      total,
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }

  async updateStatus(
    id: string,
    organizationId: string,
    data: UpdateAssistanceStatusInput
  ): Promise<AssistanceData> {
    const row = await this.prisma.assistance.update({
      where: { id, organizationId },
      data: {
        status: data.status,
        ...(data.completedAt && { completedAt: data.completedAt }),
      },
      include: ASSISTANCE_INCLUDE,
    })
    return AssistanceMapper.toDomain(row)
  }
}
