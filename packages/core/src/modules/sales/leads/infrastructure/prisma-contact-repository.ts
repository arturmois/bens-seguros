import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import type {
  ContactData,
  ContactFilters,
  ContactRepository,
  ContactSortField,
  ContactWithStage,
  CreateContactPersistence,
  CursorPage,
  Page,
  UpdateContactPersistence,
} from '../domain/contact-repository.js'
import { ContactMapper } from './contact-mapper.js'

function toInputJsonValue(
  value: Record<string, unknown>
): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value))
}

@injectable()
export class PrismaContactRepository implements ContactRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async save(data: CreateContactPersistence): Promise<ContactData> {
    const socialMedia:
      | Prisma.NullableJsonNullValueInput
      | Prisma.InputJsonValue =
      data.socialMedia === null
        ? Prisma.JsonNull
        : toInputJsonValue(data.socialMedia)
    const row = await this.prisma.contact.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        source: data.source,
        salespersonId: data.salespersonId,
        clientId: data.clientId,
        tags: data.tags,
        socialMedia,
        notes: data.notes,
        consentLgpd: data.consentLgpd,
        birthDate: data.birthDate,
      },
    })
    return ContactMapper.toDomain(row)
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<ContactData | null> {
    const row = await this.prisma.contact.findFirst({
      where: { id, organizationId, deletedAt: null },
    })
    return row ? ContactMapper.toDomain(row) : null
  }

  async findByPhone(
    phone: string,
    organizationId: string
  ): Promise<ContactData | null> {
    const row = await this.prisma.contact.findFirst({
      where: { organizationId, phone, deletedAt: null },
    })
    return row ? ContactMapper.toDomain(row) : null
  }

  async findOldestByClientId(
    clientId: string,
    organizationId: string
  ): Promise<{ id: string } | null> {
    const row = await this.prisma.contact.findFirst({
      where: { organizationId, clientId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    return row
  }

  async findByIdWithStage(
    id: string,
    organizationId: string
  ): Promise<ContactWithStage | null> {
    const row = await this.prisma.contact.findFirst({
      where: { id, organizationId, deletedAt: null },
    })
    if (!row) return null
    let activeCount = 0
    let totalCount = 0
    if (row.clientId) {
      const counts = await this.prisma.policy.groupBy({
        by: ['status'],
        where: {
          clientId: row.clientId,
          organizationId,
          deletedAt: null,
        },
        _count: { _all: true },
      })
      for (const c of counts) {
        const n = c._count._all
        totalCount += n
        if (c.status === 'ACTIVE') activeCount += n
      }
    }
    return ContactMapper.toWithStage(row, activeCount, totalCount)
  }

  async findMany(
    filters: ContactFilters,
    page: CursorPage<ContactSortField>
  ): Promise<Page<ContactWithStage>> {
    const where: Prisma.ContactWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.sourceIn &&
        filters.sourceIn.length > 0 && {
          source: { in: [...filters.sourceIn] },
        }),
      ...(filters.salespersonIdIn &&
        filters.salespersonIdIn.length > 0 && {
          salespersonId: { in: [...filters.salespersonIdIn] },
        }),
      ...(filters.source && !filters.sourceIn && { source: filters.source }),
      ...(filters.salespersonId &&
        !filters.salespersonIdIn && {
          salespersonId: filters.salespersonId,
        }),
      ...(filters.consentLgpd !== undefined && {
        consentLgpd: filters.consentLgpd,
      }),
      ...((filters.createdFrom || filters.createdTo) && {
        createdAt: {
          ...(filters.createdFrom && { gte: filters.createdFrom }),
          ...(filters.createdTo && { lte: filters.createdTo }),
        },
      }),
      ...(filters.clientId !== undefined && { clientId: filters.clientId }),
    }
    const stages = filters.stageIn?.length
      ? [...filters.stageIn]
      : filters.stage
        ? [filters.stage]
        : null
    if (stages) {
      const includesLead = stages.includes('LEAD')
      const includesClient =
        stages.includes('CLIENT_NEW') ||
        stages.includes('CLIENT_ACTIVE') ||
        stages.includes('CLIENT_INACTIVE')
      if (includesLead && !includesClient) {
        where.clientId = null
      } else if (!includesLead && includesClient) {
        where.clientId = { not: null }
      }
      // se ambos: não filtra clientId (LEAD ∪ CLIENT* = todos os contatos no domínio).
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ]
    }
    const sortBy = page.sortBy ?? 'createdAt'
    const sortOrder = page.sortOrder ?? 'desc'
    const rows = await this.prisma.contact.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder }, { id: sortOrder }],
      take: page.limit + 1,
      ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
    })
    const clientIds = rows
      .map((r) => r.clientId)
      .filter((id): id is string => id !== null)
    const policyCounts =
      clientIds.length > 0
        ? await this.prisma.policy.groupBy({
            by: ['clientId', 'status'],
            where: {
              clientId: { in: clientIds },
              organizationId: filters.organizationId,
              deletedAt: null,
            },
            _count: { _all: true },
          })
        : []
    const countsByClient = new Map<string, { active: number; total: number }>()
    for (const c of policyCounts) {
      const cur = countsByClient.get(c.clientId) ?? { active: 0, total: 0 }
      cur.total += c._count._all
      if (c.status === 'ACTIVE') cur.active += c._count._all
      countsByClient.set(c.clientId, cur)
    }
    let items: ContactWithStage[] = rows.map((row) => {
      const counts = row.clientId
        ? (countsByClient.get(row.clientId) ?? { active: 0, total: 0 })
        : { active: 0, total: 0 }
      return ContactMapper.toWithStage(row, counts.active, counts.total)
    })
    const effectiveStages = filters.stageIn?.length
      ? filters.stageIn
      : filters.stage
        ? [filters.stage]
        : null
    if (effectiveStages) {
      const includesLead = effectiveStages.includes('LEAD')
      const includesNew = effectiveStages.includes('CLIENT_NEW')
      const includesActive = effectiveStages.includes('CLIENT_ACTIVE')
      const includesInactive = effectiveStages.includes('CLIENT_INACTIVE')
      const allowedStages = new Set<ContactWithStage['stage']>()
      if (includesLead) allowedStages.add('LEAD')
      if (includesNew) allowedStages.add('CLIENT_NEW')
      if (includesActive) allowedStages.add('CLIENT_ACTIVE')
      if (includesInactive) allowedStages.add('CLIENT_INACTIVE')
      items = items.filter((i) => allowedStages.has(i.stage))
    }
    let nextCursor: string | null = null
    if (items.length > page.limit) {
      const popped = items.pop()
      nextCursor = popped?.id ?? null
    }
    return { items, nextCursor }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateContactPersistence
  ): Promise<ContactData> {
    const updateData: Prisma.ContactUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.salespersonId !== undefined) {
      updateData.salesperson = { connect: { id: data.salespersonId } }
    }
    if (data.clientId !== undefined) {
      updateData.client =
        data.clientId === null
          ? { disconnect: true }
          : { connect: { id: data.clientId } }
    }
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.socialMedia !== undefined) {
      const socialMedia:
        | Prisma.NullableJsonNullValueInput
        | Prisma.InputJsonValue =
        data.socialMedia === null
          ? Prisma.JsonNull
          : toInputJsonValue(data.socialMedia)
      updateData.socialMedia = socialMedia
    }
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate
    const row = await this.prisma.contact.update({
      where: { id, organizationId },
      data: updateData,
    })
    return ContactMapper.toDomain(row)
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.prisma.contact.update({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    })
  }
}
