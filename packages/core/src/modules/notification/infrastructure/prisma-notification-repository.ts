import type { PrismaClient } from '@repo/db'
import type { NotificationRepository } from '../domain/notification-repository.js'
import type {
  CreateNotificationInput,
  NotificationData,
  NotificationFilters,
} from '../domain/notification-types.js'

function toData(row: Record<string, unknown>): NotificationData {
  return {
    id: row.id as string,
    organizationId: row.organizationId as string,
    userId: row.userId as string,
    type: row.type as string,
    title: row.title as string,
    body: row.body as string,
    entityType: (row.entityType as string | null) ?? null,
    entityId: (row.entityId as string | null) ?? null,
    read: row.read as boolean,
    readAt: (row.readAt as Date | null) ?? null,
    emailSent: row.emailSent as boolean,
    createdAt: row.createdAt as Date,
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
    return toData(row as unknown as Record<string, unknown>)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<NotificationData | null> {
    const row = await this.prisma.notification.findFirst({
      where: { id, organizationId },
    })
    if (!row) return null
    return toData(row as unknown as Record<string, unknown>)
  }

  async findMany(filters: NotificationFilters): Promise<{
    data: NotificationData[]
    total: number
    nextCursor: string | null
  }> {
    const limit = filters.limit ?? 20
    const where: Record<string, unknown> = {
      organizationId: filters.organizationId,
      userId: filters.userId,
    }
    if (filters.read !== undefined) {
      where.read = filters.read
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
    const data = (hasMore ? rows.slice(0, limit) : rows).map((r) =>
      toData(r as unknown as Record<string, unknown>)
    )
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
}
