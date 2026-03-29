import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type { CursorPage, Page } from '../../client/domain/client-repository.js'
import type {
  CommissionRepository,
  CommissionData,
  CommissionFilters,
  ReverseAtomicResult,
} from '../domain/commission-repository.js'
import type { Commission } from '../domain/commission.js'
import { CommissionMapper } from './commission-mapper.js'

const COMMISSION_INCLUDE = {
  salesperson: { select: { name: true } },
  policy: {
    select: { policyNumber: true, client: { select: { name: true } } },
  },
} satisfies Prisma.CommissionInclude

@injectable()
export class PrismaCommissionRepository implements CommissionRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async save(commission: Commission): Promise<CommissionData> {
    const data = CommissionMapper.toPersistence(commission.toJSON())
    const row = await this.prisma.commission.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        policyId: data.policyId,
        salespersonId: data.salespersonId,
        status: data.status,
        commissionValueInCents: data.commissionValueInCents,
        premiumValueInCents: data.premiumValueInCents,
        percentageInBasisPoints: data.percentageInBasisPoints,
        splitPercentage: data.splitPercentage,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt,
        paidAt: data.paidAt,
        rejectedBy: data.rejectedBy,
        rejectedAt: data.rejectedAt,
        rejectionReason: data.rejectionReason,
        isReversal: data.isReversal,
        originalCommissionId: data.originalCommissionId,
      },
      include: COMMISSION_INCLUDE,
    })
    return CommissionMapper.toData(row)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<CommissionData | null> {
    const row = await this.prisma.commission.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: COMMISSION_INCLUDE,
    })
    return row ? CommissionMapper.toData(row) : null
  }

  async findMany(
    filters: CommissionFilters,
    page: CursorPage
  ): Promise<Page<CommissionData>> {
    const where: Prisma.CommissionWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.salespersonId && { salespersonId: filters.salespersonId }),
      ...(filters.policyId && { policyId: filters.policyId }),
      ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
      ...(filters.dateTo && {
        createdAt: {
          ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
          lte: filters.dateTo,
        },
      }),
      ...(filters.search && {
        OR: [
          {
            salesperson: {
              name: { contains: filters.search, mode: 'insensitive' },
            },
          },
          {
            policy: {
              policyNumber: { contains: filters.search, mode: 'insensitive' },
            },
          },
        ],
      }),
    }

    const [rows, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: COMMISSION_INCLUDE,
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.commission.count({ where }),
    ])

    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows

    return {
      items: items.map(CommissionMapper.toData),
      total,
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }

  async update(commission: Commission): Promise<CommissionData> {
    const data = CommissionMapper.toPersistence(commission.toJSON())
    const row = await this.prisma.commission.update({
      where: { id: data.id, organizationId: data.organizationId },
      data: {
        status: data.status,
        commissionValueInCents: data.commissionValueInCents,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt,
        paidAt: data.paidAt,
        rejectedBy: data.rejectedBy,
        rejectedAt: data.rejectedAt,
        rejectionReason: data.rejectionReason,
        deletedAt: data.deletedAt,
      },
      include: COMMISSION_INCLUDE,
    })
    return CommissionMapper.toData(row)
  }

  async reverseAtomic(
    original: Commission,
    reversal: Commission
  ): Promise<ReverseAtomicResult> {
    const originalData = CommissionMapper.toPersistence(original.toJSON())
    const reversalData = CommissionMapper.toPersistence(reversal.toJSON())

    const [updatedOriginalRow, createdReversalRow] =
      await this.prisma.$transaction([
        this.prisma.commission.update({
          where: {
            id: originalData.id,
            organizationId: originalData.organizationId,
          },
          data: {
            status: originalData.status,
            commissionValueInCents: originalData.commissionValueInCents,
            approvedBy: originalData.approvedBy,
            approvedAt: originalData.approvedAt,
            paidAt: originalData.paidAt,
            rejectedBy: originalData.rejectedBy,
            rejectedAt: originalData.rejectedAt,
            rejectionReason: originalData.rejectionReason,
            deletedAt: originalData.deletedAt,
          },
          include: COMMISSION_INCLUDE,
        }),
        this.prisma.commission.create({
          data: {
            id: reversalData.id,
            organizationId: reversalData.organizationId,
            policyId: reversalData.policyId,
            salespersonId: reversalData.salespersonId,
            status: reversalData.status,
            commissionValueInCents: reversalData.commissionValueInCents,
            premiumValueInCents: reversalData.premiumValueInCents,
            percentageInBasisPoints: reversalData.percentageInBasisPoints,
            splitPercentage: reversalData.splitPercentage,
            approvedBy: reversalData.approvedBy,
            approvedAt: reversalData.approvedAt,
            paidAt: reversalData.paidAt,
            rejectedBy: reversalData.rejectedBy,
            rejectedAt: reversalData.rejectedAt,
            rejectionReason: reversalData.rejectionReason,
            isReversal: reversalData.isReversal,
            originalCommissionId: reversalData.originalCommissionId,
          },
          include: COMMISSION_INCLUDE,
        }),
      ])

    return {
      savedOriginal: CommissionMapper.toData(updatedOriginalRow),
      savedReversal: CommissionMapper.toData(createdReversalRow),
    }
  }
}
