import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type { Proposal } from '../domain/proposal.js'
import type {
  ProposalRepository,
  ProposalFilters,
  ProposalCursorPage,
  ProposalPage,
} from '../domain/proposal-repository.js'
import { ProposalMapper } from './proposal-mapper.js'

const PROPOSAL_INCLUDE = {
  client: { select: { name: true, document: true, personType: true } },
  salesperson: { select: { name: true } },
  insurer: { select: { name: true } },
  sourcePolicy: { select: { policyNumber: true } },
} satisfies Prisma.ProposalInclude

@injectable()
export class PrismaProposalRepository implements ProposalRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async save(proposal: Proposal): Promise<void> {
    const data = ProposalMapper.toPersistence(proposal)
    await this.prisma.proposal.upsert({
      where: { id: data.id },
      create: data,
      update: {
        stage: data.stage,
        premiumValueInCents: data.premiumValueInCents,
        commissionPercentageInCents: data.commissionPercentageInCents,
        details: data.details,
        lostReason: data.lostReason,
        insurerId: data.insurerId,
        coverageStartDate: data.coverageStartDate,
        coverageEndDate: data.coverageEndDate,
        sentToClientAt: data.sentToClientAt,
        clientResponseAt: data.clientResponseAt,
        quoteValidUntil: data.quoteValidUntil,
        updatedAt: data.updatedAt,
      },
    })
  }

  async findById(id: string, organizationId: string): Promise<Proposal | null> {
    const row = await this.prisma.proposal.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: PROPOSAL_INCLUDE,
    })
    return row ? ProposalMapper.toDomain(row) : null
  }

  async findMany(
    filters: ProposalFilters,
    page: ProposalCursorPage
  ): Promise<ProposalPage> {
    const sortBy = page.sortBy ?? 'createdAt'
    const sortOrder = page.sortOrder ?? 'desc'

    const primaryOrderBy: Prisma.ProposalOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'clientName':
          return { client: { name: sortOrder } }
        case 'branch':
          return { branch: sortOrder }
        case 'stage':
          return { stage: sortOrder }
        case 'boardType':
          return { boardType: sortOrder }
        case 'premiumValueInCents':
          return { premiumValueInCents: sortOrder }
        case 'createdAt':
        default:
          return { createdAt: sortOrder }
      }
    })()

    const createdAt: Prisma.DateTimeFilter = {}

    if (filters.createdFrom) {
      createdAt.gte = filters.createdFrom
    }

    if (filters.createdTo) {
      createdAt.lte = filters.createdTo
    }

    const updatedAt: Prisma.DateTimeFilter = {}

    if (filters.updatedAtFrom) {
      updatedAt.gte = filters.updatedAtFrom
    }

    if (filters.updatedAtTo) {
      updatedAt.lte = filters.updatedAtTo
    }

    const stageFilter: Prisma.EnumProposalStageFilter | undefined =
      filters.stages && filters.stages.length > 0
        ? { in: [...filters.stages] }
        : filters.stage
          ? { equals: filters.stage }
          : undefined

    const where: Prisma.ProposalWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(stageFilter && { stage: stageFilter }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.salespersonId && { salespersonId: filters.salespersonId }),
      ...(filters.boardType && { boardType: filters.boardType }),
      ...(filters.insurerId && { insurerId: filters.insurerId }),
      ...(filters.sourcePolicyId && { sourcePolicyId: filters.sourcePolicyId }),
      ...(Object.keys(createdAt).length > 0 && { createdAt }),
      ...(Object.keys(updatedAt).length > 0 && { updatedAt }),
      ...(filters.search && {
        OR: [
          {
            client: {
              name: { contains: filters.search, mode: 'insensitive' },
            },
          },
          {
            sourcePolicy: {
              policyNumber: { contains: filters.search, mode: 'insensitive' },
            },
          },
        ],
      }),
    }

    const rows = await this.prisma.proposal.findMany({
      where,
      include: PROPOSAL_INCLUDE,
      take: page.limit + 1,
      ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
      orderBy: [primaryOrderBy, { id: sortOrder }],
    })

    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows

    return {
      items: items.map(ProposalMapper.toDomain),
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }
}
