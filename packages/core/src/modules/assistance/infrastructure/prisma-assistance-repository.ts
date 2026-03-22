import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type { CursorPage, Page } from '../../client/domain/client-repository.js'
import type {
  AssistanceRepository,
  AssistanceData,
  AssistanceFilters,
  CreateAssistanceInput,
  UpdateAssistanceStatusInput,
} from '../domain/assistance-repository.js'
import { AssistanceMapper } from './assistance-mapper.js'

const ASSISTANCE_INCLUDE = {
  policy: { select: { policyNumber: true } },
  client: { select: { name: true } },
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
    page: CursorPage
  ): Promise<Page<AssistanceData>> {
    const where: Prisma.AssistanceWhereInput = {
      organizationId: filters.organizationId,
      ...(filters.status && { status: filters.status }),
      ...(filters.policyId && { policyId: filters.policyId }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.type && { type: filters.type }),
    }

    const [rows, total] = await Promise.all([
      this.prisma.assistance.findMany({
        where,
        include: ASSISTANCE_INCLUDE,
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
