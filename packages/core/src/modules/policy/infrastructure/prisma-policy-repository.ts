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
import { PolicyMapper } from './policy-mapper.js'

const POLICY_INCLUDE = {
  client: { select: { name: true } },
  salesperson: { select: { name: true } },
  proposal: { select: { id: true } },
} satisfies Prisma.PolicyInclude

@injectable()
export class PrismaPolicyRepository implements PolicyRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreatePolicyInput): Promise<PolicyData> {
    const row = await this.prisma.policy.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        proposalId: data.proposalId,
        clientId: data.clientId,
        salespersonId: data.salespersonId,
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

  async findMany(
    filters: PolicyFilters,
    page: PolicyCursorPage
  ): Promise<PolicyPage> {
    const where: Prisma.PolicyWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.proposalId && { proposalId: filters.proposalId }),
      ...(filters.salespersonId && { salespersonId: filters.salespersonId }),
      ...(filters.branch && { branch: filters.branch }),
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
              name: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
    }

    const [rows, total] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        include: POLICY_INCLUDE,
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.policy.count({ where }),
    ])

    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows

    return {
      items: items.map(PolicyMapper.toDomain),
      total,
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
