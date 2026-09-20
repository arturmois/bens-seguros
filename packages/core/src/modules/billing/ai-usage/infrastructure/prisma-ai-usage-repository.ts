import type { PrismaClient } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import type { AiUsageRecord, UsageUnitType } from '../domain/ai-usage-record.js'
import type {
  AiUsageRepository,
  ListAiUsageFilters,
  ListAiUsagePagination,
  ListAiUsageResult,
} from '../domain/ai-usage-repository.js'

interface PrismaRow {
  readonly id: string
  readonly organizationId: string
  readonly periodKey: string
  readonly channelIdHash: string | null
  readonly conversationIdHash: string | null
  readonly messageIdHash: string | null
  readonly agentIdHash: string | null
  readonly provider: string
  readonly model: string
  readonly inputQuantity: number
  readonly outputQuantity: number
  readonly unitType: UsageUnitType
  readonly inputCostMicrocents: number
  readonly outputCostMicrocents: number
  readonly countedAsIncluded: boolean | null
  readonly overageCents: number | null
  readonly createdAt: Date
}

function toDomain(row: PrismaRow): AiUsageRecord {
  return {
    organizationId: row.organizationId,
    periodKey: row.periodKey,
    channelIdHash: row.channelIdHash,
    conversationIdHash: row.conversationIdHash,
    messageIdHash: row.messageIdHash,
    agentIdHash: row.agentIdHash,
    provider: row.provider,
    model: row.model,
    inputQuantity: row.inputQuantity,
    outputQuantity: row.outputQuantity,
    unitType: row.unitType,
    inputCostMicrocents: row.inputCostMicrocents,
    outputCostMicrocents: row.outputCostMicrocents,
    countedAsIncluded: row.countedAsIncluded,
    overageCents: row.overageCents,
    createdAt: row.createdAt,
  }
}

@injectable()
export class PrismaAiUsageRepository implements AiUsageRepository {
  constructor(
    @inject('PrismaAdminClient') private readonly prisma: PrismaClient
  ) {}

  async create(record: AiUsageRecord): Promise<void> {
    await this.prisma.aiUsageRecord.create({
      data: {
        organizationId: record.organizationId,
        periodKey: record.periodKey,
        channelIdHash: record.channelIdHash,
        conversationIdHash: record.conversationIdHash,
        messageIdHash: record.messageIdHash,
        agentIdHash: record.agentIdHash,
        provider: record.provider,
        model: record.model,
        inputQuantity: record.inputQuantity,
        outputQuantity: record.outputQuantity,
        unitType: record.unitType,
        inputCostMicrocents: record.inputCostMicrocents,
        outputCostMicrocents: record.outputCostMicrocents,
        countedAsIncluded: record.countedAsIncluded,
        overageCents: record.overageCents,
        createdAt: record.createdAt,
      },
    })
  }

  async list(
    filters: ListAiUsageFilters,
    pagination: ListAiUsagePagination
  ): Promise<ListAiUsageResult> {
    const { limit, cursor } = pagination
    const rows = await this.prisma.aiUsageRecord.findMany({
      where: {
        organizationId: filters.organizationId,
        ...(filters.periodKey !== undefined && {
          periodKey: filters.periodKey,
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor !== undefined && { cursor: { id: cursor }, skip: 1 }),
    })

    const hasMore = rows.length > limit
    const slice = hasMore ? rows.slice(0, limit) : rows
    const lastItem = slice[slice.length - 1]
    const nextCursor = hasMore && lastItem ? lastItem.id : null

    return {
      items: slice.map(toDomain),
      nextCursor,
    }
  }

  async existsByMessageIdHash(
    organizationId: string,
    messageIdHash: string
  ): Promise<boolean> {
    const row = await this.prisma.aiUsageRecord.findFirst({
      where: { organizationId, messageIdHash },
      select: { id: true },
    })
    return row !== null
  }
}
