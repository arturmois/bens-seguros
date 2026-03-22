import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type {
  OccurrenceRepository,
  OccurrenceData,
  CreateOccurrenceInput,
} from '../domain/occurrence-repository.js'
import { OccurrenceMapper } from './occurrence-mapper.js'

@injectable()
export class PrismaOccurrenceRepository implements OccurrenceRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateOccurrenceInput): Promise<OccurrenceData> {
    const row = await this.prisma.occurrence.create({
      data: {
        claimId: data.claimId,
        type: data.type,
        description: data.description,
        metadata:
          data.metadata === undefined || data.metadata === null
            ? Prisma.JsonNull
            : data.metadata,
        createdBy: data.createdBy ?? null,
      },
    })

    const createdByName = await this.resolveUserName(row.createdBy)
    return OccurrenceMapper.toDomain(row, createdByName)
  }

  async findByClaimId(claimId: string): Promise<OccurrenceData[]> {
    const rows = await this.prisma.occurrence.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
    })

    const userIds = rows
      .map((r) => r.createdBy)
      .filter((id): id is string => id !== null)

    const userNameMap = await this.resolveUserNames(userIds)
    return rows.map((row) =>
      OccurrenceMapper.toDomain(
        row,
        row.createdBy ? userNameMap.get(row.createdBy) : undefined
      )
    )
  }

  private async resolveUserName(
    userId: string | null
  ): Promise<string | undefined> {
    if (!userId) {
      return undefined
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    return user?.name
  }

  private async resolveUserNames(
    userIds: string[]
  ): Promise<Map<string, string>> {
    if (userIds.length === 0) {
      return new Map()
    }

    const uniqueIds = [...new Set(userIds)]
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true },
    })

    return new Map(users.map((u) => [u.id, u.name]))
  }
}
