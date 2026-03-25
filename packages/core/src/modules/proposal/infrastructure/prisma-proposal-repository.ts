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
  client: { select: { name: true, document: true } },
  salesperson: { select: { name: true } },
  insurer: { select: { name: true } },
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
    const where: Prisma.ProposalWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.stage && { stage: filters.stage }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.salespersonId && { salespersonId: filters.salespersonId }),
      ...(filters.boardType && { boardType: filters.boardType }),
      ...(filters.search && {
        client: {
          name: { contains: filters.search, mode: 'insensitive' },
        },
      }),
    }

    const [rows, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        include: PROPOSAL_INCLUDE,
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.proposal.count({ where }),
    ])

    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows

    return {
      items: items.map(ProposalMapper.toDomain),
      total,
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }
}
