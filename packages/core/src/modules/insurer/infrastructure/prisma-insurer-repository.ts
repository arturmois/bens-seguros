import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type { CursorPage, Page } from '../../client/domain/client-repository.js'
import type {
  InsurerRepository,
  InsurerData,
  InsurerFilters,
  CreateInsurerInput,
  UpdateInsurerInput,
} from '../domain/insurer-repository.js'
import { InsurerMapper } from './insurer-mapper.js'

@injectable()
export class PrismaInsurerRepository implements InsurerRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateInsurerInput): Promise<InsurerData> {
    const row = await this.prisma.insurer.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        code: data.code ?? null,
        active: data.active ?? true,
      },
    })

    return InsurerMapper.toDomain(row)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<InsurerData | null> {
    const row = await this.prisma.insurer.findFirst({
      where: { id, organizationId },
    })
    return row ? InsurerMapper.toDomain(row) : null
  }

  async findByName(
    name: string,
    organizationId: string
  ): Promise<InsurerData | null> {
    const row = await this.prisma.insurer.findFirst({
      where: { name, organizationId },
    })
    return row ? InsurerMapper.toDomain(row) : null
  }

  async findMany(
    filters: InsurerFilters,
    page: CursorPage
  ): Promise<Page<InsurerData>> {
    const where: Prisma.InsurerWhereInput = {
      organizationId: filters.organizationId,
      ...(filters.active !== undefined && { active: filters.active }),
      ...(filters.search && {
        name: { contains: filters.search, mode: 'insensitive' },
      }),
    }

    const rows = await this.prisma.insurer.findMany({
      where,
      take: page.limit + 1,
      ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
      orderBy: { name: 'asc' },
    })

    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows

    return {
      items: items.map(InsurerMapper.toDomain),
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }

  async update(data: UpdateInsurerInput): Promise<InsurerData> {
    const row = await this.prisma.insurer.update({
      where: { id: data.id },
      data: {
        name: data.name,
        code: data.code ?? null,
        ...(data.active !== undefined && { active: data.active }),
      },
    })

    return InsurerMapper.toDomain(row)
  }
}
