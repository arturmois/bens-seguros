import type { PrismaClient, Notification } from '@repo/db'
import { Prisma } from '@repo/db'
import type { NotificationRepository } from '../domain/notification-repository.js'
import type {
  CreateNotificationInput,
  NotificationData,
  NotificationFilters,
} from '../domain/notification-types.js'

function toData(row: Notification): NotificationData {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entityType,
    entityId: row.entityId,
    read: row.read,
    readAt: row.readAt,
    emailSent: row.emailSent,
    createdAt: row.createdAt,
  }
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateNotificationInput): Promise<NotificationData> {
    const row = await this.prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    })
    return toData(row)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<NotificationData | null> {
    const row = await this.prisma.notification.findFirst({
      where: { id, organizationId },
    })
    if (!row) return null
    return toData(row)
  }

  async findMany(filters: NotificationFilters): Promise<{
    data: NotificationData[]
    total: number
    nextCursor: string | null
  }> {
    const limit = filters.limit ?? 20
    const where: Prisma.NotificationWhereInput = {
      organizationId: filters.organizationId,
      userId: filters.userId,
      ...(filters.read !== undefined && { read: filters.read }),
    }

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      }),
      this.prisma.notification.count({ where }),
    ])

    const hasMore = rows.length > limit
    const data = (hasMore ? rows.slice(0, limit) : rows).map(toData)
    const nextCursor = hasMore ? (data.at(-1)?.id ?? null) : null

    return { data, total, nextCursor }
  }

  async markAsRead(
    id: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, organizationId, userId, read: false },
      data: { read: true, readAt: new Date() },
    })
  }

  async markAllAsRead(organizationId: string, userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { organizationId, userId, read: false },
      data: { read: true, readAt: new Date() },
    })
    return result.count
  }

  async countUnread(organizationId: string, userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { organizationId, userId, read: false },
    })
  }

  async countAlertsByEntityType(
    organizationId: string,
    userId: string,
    types: readonly string[]
  ): Promise<Record<string, number>> {
    const results = await this.prisma.notification.groupBy({
      by: ['entityType'],
      where: {
        organizationId,
        userId,
        read: false,
        type: { in: [...types] },
        entityType: { not: null },
      },
      _count: { id: true },
    })

    const counts: Record<string, number> = {
      Policy: 0,
      Claim: 0,
      Commission: 0,
      Proposal: 0,
    }

    for (const row of results) {
      if (row.entityType) {
        counts[row.entityType] = row._count.id
      }
    }

    return counts
  }
}
