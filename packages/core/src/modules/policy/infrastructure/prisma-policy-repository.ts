import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type {
  PolicyRepository,
  PolicyData,
  PolicyFilters,
  PolicyCursorPage,
  PolicyPage,
  CreatePolicyInput,
} from '../domain/policy-repository.js'
import { PolicyErrors } from '../domain/policy-errors.js'
import { PolicyMapper } from './policy-mapper.js'

const POLICY_INCLUDE = {
  client: { select: { legalName: true, document: true } },
  salesperson: { select: { name: true } },
  insurer: { select: { name: true } },
  proposal: { select: { id: true, details: true, boardType: true } },
} satisfies Prisma.PolicyInclude

@injectable()
export class PrismaPolicyRepository implements PolicyRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreatePolicyInput): Promise<PolicyData> {
    try {
      const row = await this.prisma.policy.create({
        data: {
          id: data.id,
          organizationId: data.organizationId,
          proposalId: data.proposalId,
          clientId: data.clientId,
          salespersonId: data.salespersonId,
          insurerId: data.insurerId,
          policyNumber: data.policyNumber,
          status: data.status,
          branch: data.branch,
          premiumValueInCents: data.premiumValueInCents,
          coverageDetails:
            data.coverageDetails === null
              ? Prisma.JsonNull
              : data.coverageDetails,
          startDate: data.startDate,
          endDate: data.endDate,
        },
        include: POLICY_INCLUDE,
      })
      return PolicyMapper.toDomain(row)
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw PolicyErrors.duplicatePolicy(data.policyNumber)
      }
      throw error
    }
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<PolicyData | null> {
    const row = await this.prisma.policy.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: POLICY_INCLUDE,
    })
    return row ? PolicyMapper.toDomain(row) : null
  }

  async findByPolicyNumber(
    policyNumber: string,
    organizationId: string
  ): Promise<PolicyData | null> {
    const row = await this.prisma.policy.findFirst({
      where: { policyNumber, organizationId, deletedAt: null },
      include: POLICY_INCLUDE,
    })
    return row ? PolicyMapper.toDomain(row) : null
  }

  async findMany(
    filters: PolicyFilters,
    page: PolicyCursorPage
  ): Promise<PolicyPage> {
    const createdAt: Prisma.DateTimeFilter = {}
    if (filters.createdFrom) createdAt.gte = filters.createdFrom
    if (filters.createdTo) createdAt.lte = filters.createdTo
    const endDate: Prisma.DateTimeFilter = {}
    if (filters.endDateFrom) endDate.gte = filters.endDateFrom
    if (filters.endDateTo) endDate.lte = filters.endDateTo
    const where: Prisma.PolicyWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.statusIn?.length
        ? { status: { in: [...filters.statusIn] } }
        : filters.status && { status: filters.status }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.proposalId && { proposalId: filters.proposalId }),
      ...(filters.salespersonId && { salespersonId: filters.salespersonId }),
      ...(filters.branchIn?.length
        ? { branch: { in: [...filters.branchIn] } }
        : filters.branch && { branch: filters.branch }),
      ...(filters.boardTypeIn?.length
        ? { proposal: { boardType: { in: [...filters.boardTypeIn] } } }
        : filters.boardType && { proposal: { boardType: filters.boardType } }),
      ...(Object.keys(createdAt).length > 0 && { createdAt }),
      ...(Object.keys(endDate).length > 0 && { endDate }),
      ...(filters.search && {
        OR: [
          {
            policyNumber: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
          {
            client: {
              legalName: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
    }
    const rows = await this.prisma.policy.findMany({
      where,
      include: POLICY_INCLUDE,
      take: page.limit + 1,
      ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows
    return {
      items: items.map(PolicyMapper.toDomain),
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }

  async cancel(
    id: string,
    organizationId: string,
    reason: string
  ): Promise<PolicyData> {
    const row = await this.prisma.policy.update({
      where: { id, organizationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: POLICY_INCLUDE,
    })
    return PolicyMapper.toDomain(row)
  }
}
