import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type { CursorPage, Page } from '../../client/domain/client-repository.js'
import type {
  InsurerRepository,
  InsurerData,
  InsurerFilters,
  InsurerSortField,
  CreateInsurerInput,
  UpdateInsurerInput,
} from '../domain/insurer-repository.js'
import { InsurerErrors } from '../domain/insurer-errors.js'
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
    page: CursorPage<InsurerSortField>
  ): Promise<Page<InsurerData>> {
    const where: Prisma.InsurerWhereInput = {
      organizationId: filters.organizationId,
      ...(filters.active !== undefined && { active: filters.active }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    }

    const sortBy = page.sortBy ?? 'name'
    const sortOrder = page.sortOrder ?? 'asc'

    const primaryOrderBy: Prisma.InsurerOrderByWithRelationInput = (() => {
      switch (sortBy) {
        case 'code':
          return { code: sortOrder }
        case 'active':
          return { active: sortOrder }
        case 'updatedAt':
          return { updatedAt: sortOrder }
        case 'name':
        default:
          return { name: sortOrder }
      }
    })()

    const rows = await this.prisma.insurer.findMany({
      where,
      take: page.limit + 1,
      ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
      orderBy: [primaryOrderBy, { id: sortOrder }],
    })

    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows

    return {
      items: items.map(InsurerMapper.toDomain),
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }

  async update(data: UpdateInsurerInput): Promise<InsurerData> {
    const updateData: Prisma.InsurerUpdateInput = {
      name: data.name,
    }

    if (data.code !== undefined) {
      updateData.code = data.code
    }

    if (data.active !== undefined) {
      updateData.active = data.active
    }

    const result = await this.prisma.insurer.updateMany({
      where: { id: data.id, organizationId: data.organizationId },
      data: updateData,
    })

    if (result.count === 0) {
      throw InsurerErrors.notFound(data.id)
    }

    const row = await this.prisma.insurer.findFirst({
      where: { id: data.id, organizationId: data.organizationId },
    })

    if (!row) {
      throw InsurerErrors.notFound(data.id)
    }

    return InsurerMapper.toDomain(row)
  }
}
