import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import { isInsuredObjectDetails } from '../domain/insured-object-details.js'
import { ProposalErrors } from '../domain/proposal-errors.js'
import type {
  ProposalListItem,
  ProposalListPage,
} from '../domain/proposal-list-item.js'
import type {
  ProposalCursorPage,
  ProposalFilters,
  ProposalRepository,
} from '../domain/proposal-repository.js'
import type { Proposal } from '../domain/proposal.js'
import { parseSourcePolicySnapshot } from '../domain/proposal.js'
import { ProposalMapper } from './proposal-mapper.js'

const PROPOSAL_INCLUDE = {
  contact: {
    select: {
      name: true,
      client: { select: { document: true, personType: true, legalName: true } },
    },
  },
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

  async findByIdOrFail(id: string, organizationId: string): Promise<Proposal> {
    const found = await this.findById(id, organizationId)
    if (!found) throw ProposalErrors.notFound(id)
    return found
  }

  async listForView(
    filters: ProposalFilters,
    page: ProposalCursorPage
  ): Promise<ProposalListPage> {
    const { hasNext, items } = await this.queryRows(filters, page)
    return {
      items: items.map((row) => this.toListItem(row)),
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }

  private toListItem(
    row: Prisma.ProposalGetPayload<{ include: typeof PROPOSAL_INCLUDE }>
  ): ProposalListItem {
    return {
      id: row.id,
      organizationId: row.organizationId,
      contactId: row.contactId,
      salespersonId: row.salespersonId,
      stage: row.stage,
      boardType: row.boardType,
      branch: row.branch,
      premiumValueInCents: row.premiumValueInCents,
      commissionPercentageInCents: row.commissionPercentageInCents,
      details: isInsuredObjectDetails(row.details) ? row.details : null,
      lostReason: row.lostReason,
      renewalPolicyId: row.renewalPolicyId,
      renewalPolicyNumber: row.renewalPolicyNumber ?? null,
      sourcePolicyId: row.sourcePolicyId,
      endorsementType: row.endorsementType,
      endorsementReason: row.endorsementReason,
      sourcePolicySnapshot: parseSourcePolicySnapshot(row.sourcePolicySnapshot),
      insurerId: row.insurerId,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      coverageStartDate: row.coverageStartDate ?? null,
      coverageEndDate: row.coverageEndDate ?? null,
      sentToClientAt: row.sentToClientAt ?? null,
      clientResponseAt: row.clientResponseAt ?? null,
      quoteValidUntil: row.quoteValidUntil ?? null,
      clientName: row.contact?.name,
      clientDocument: row.contact?.client?.document,
      clientPersonType: row.contact?.client?.personType,
      salespersonName: row.salesperson?.name,
      insurerName: row.insurer?.name,
    }
  }

  private async queryRows(filters: ProposalFilters, page: ProposalCursorPage) {
    const sortBy = page.sortBy ?? 'createdAt'
    const sortOrder = page.sortOrder ?? 'desc'
    const primaryOrderBy: Prisma.ProposalOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'clientName':
          return { contact: { name: sortOrder } }
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
      filters.stageIn && filters.stageIn.length > 0
        ? { in: [...filters.stageIn] }
        : filters.stage
          ? { equals: filters.stage }
          : undefined
    const where: Prisma.ProposalWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(stageFilter && { stage: stageFilter }),
      ...(filters.branchIn?.length && {
        branch: { in: [...filters.branchIn] },
      }),
      ...(filters.salespersonIdIn?.length && {
        salespersonId: { in: [...filters.salespersonIdIn] },
      }),
      ...(filters.contactId && { contactId: filters.contactId }),
      ...(filters.clientId && { contact: { clientId: filters.clientId } }),
      ...(filters.salespersonId && { salespersonId: filters.salespersonId }),
      ...(filters.boardType && { boardType: filters.boardType }),
      ...(filters.insurerId && { insurerId: filters.insurerId }),
      ...(filters.sourcePolicyId && { sourcePolicyId: filters.sourcePolicyId }),
      ...(Object.keys(createdAt).length > 0 && { createdAt }),
      ...(Object.keys(updatedAt).length > 0 && { updatedAt }),
      ...(filters.search && {
        OR: [
          {
            contact: {
              name: { contains: filters.search, mode: 'insensitive' },
            },
          },
          {
            contact: {
              client: {
                legalName: { contains: filters.search, mode: 'insensitive' },
              },
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
    return { hasNext, items }
  }
}
