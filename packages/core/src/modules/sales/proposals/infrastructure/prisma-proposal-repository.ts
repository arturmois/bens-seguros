import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import { isInsuredObjectDetails } from '../domain/insured-object-details.js'
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
        observations: data.observations,
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

  async findActiveByContact(
    contactId: string,
    organizationId: string
  ): Promise<Proposal[]> {
    const rows = await this.prisma.proposal.findMany({
      where: {
        contactId,
        organizationId,
        deletedAt: null,
        stage: { notIn: ['POLICY_ISSUED', 'LOST'] },
      },
      include: PROPOSAL_INCLUDE,
    })
    return rows.map((row) => ProposalMapper.toDomain(row))
  }

  async listForClient(input: {
    organizationId: string
    clientId: string
    status: 'ACTIVE' | 'LOST' | 'ALL'
    limit: number
  }): Promise<
    Array<{
      id: string
      branch: string
      stage: string
      premiumValueInCents: number | null
      coverageStartDate: Date | null
      createdAt: Date
      clientName: string
    }>
  > {
    const stageFilter =
      input.status === 'LOST'
        ? { stage: 'LOST' as const }
        : input.status === 'ACTIVE'
          ? { stage: { notIn: ['LOST' as const, 'POLICY_ISSUED' as const] } }
          : {}
    const rows = await this.prisma.proposal.findMany({
      where: {
        organizationId: input.organizationId,
        contact: { clientId: input.clientId },
        deletedAt: null,
        ...stageFilter,
      },
      include: { contact: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
    })
    return rows.map((row) => ({
      id: row.id,
      branch: row.branch,
      stage: row.stage,
      premiumValueInCents: row.premiumValueInCents,
      coverageStartDate: row.coverageStartDate,
      createdAt: row.createdAt,
      clientName: row.contact?.name ?? '',
    }))
  }

  async markQuoteSent(input: {
    proposalId: string
    organizationId: string
    sentToClientAt: Date
  }): Promise<void> {
    await this.prisma.proposal.updateMany({
      where: {
        id: input.proposalId,
        organizationId: input.organizationId,
      },
      data: { sentToClientAt: input.sentToClientAt },
    })
  }

  async findStagnant(input: {
    organizationId: string
    updatedBefore: Date
  }): Promise<
    Array<{
      id: string
      salespersonId: string
      stage: string
      updatedAt: Date
      clientName: string
    }>
  > {
    const rows = await this.prisma.proposal.findMany({
      where: {
        organizationId: input.organizationId,
        stage: { notIn: ['POLICY_ISSUED', 'LOST'] },
        deletedAt: null,
        updatedAt: { lt: input.updatedBefore },
      },
      include: {
        contact: { include: { client: { select: { legalName: true } } } },
      },
    })
    return rows.map((row) => ({
      id: row.id,
      salespersonId: row.salespersonId,
      stage: row.stage,
      updatedAt: row.updatedAt,
      clientName: row.contact?.client?.legalName ?? row.contact?.name ?? 'N/A',
    }))
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
      observations: row.observations,
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
