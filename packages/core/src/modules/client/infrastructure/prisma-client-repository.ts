import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import { ClientErrors } from '../domain/client-errors.js'
import type {
  ClientData,
  ClientFilters,
  ClientRepository,
  ClientSortField,
  ClientWithMetrics,
  CreateClientPersistence,
  CursorPage,
  UpdateClientPersistence,
} from '../domain/client-repository.js'
import { ClientMapper } from './client-mapper.js'

function toInputJsonValue(
  value: Record<string, unknown>
): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value))
}

@injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async save(data: CreateClientPersistence): Promise<ClientData> {
    const docPersistence = ClientMapper.documentToPersistence(data.document)
    const address: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
      data.address === null ? Prisma.JsonNull : toInputJsonValue(data.address)

    try {
      const row = await this.prisma.client.create({
        data: {
          organizationId: data.organizationId,
          legalName: data.legalName,
          document: docPersistence.document,
          documentEncrypted: docPersistence.documentEncrypted,
          documentHash: docPersistence.documentHash,
          personType: data.personType,
          profession: data.profession,
          maritalStatus: data.maritalStatus,
          address,
          fiscalBirthDate: data.fiscalBirthDate,
        },
      })
      return ClientMapper.toDomain(row)
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw ClientErrors.alreadyExists()
      }
      throw e
    }
  }

  async findById(
    id: string,
    organizationId: string
  ): Promise<ClientData | null> {
    const row = await this.prisma.client.findFirst({
      where: { id, organizationId, deletedAt: null },
    })
    return row ? ClientMapper.toDomain(row) : null
  }

  async findByIdWithMetrics(
    id: string,
    organizationId: string
  ): Promise<ClientWithMetrics | null> {
    const row = await this.prisma.client.findFirst({
      where: { id, organizationId, deletedAt: null },
    })
    if (!row) return null

    const [policyCounts, contactCount] = await Promise.all([
      this.prisma.policy.groupBy({
        by: ['status'],
        where: { clientId: id, organizationId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.contact.count({
        where: { clientId: id, organizationId, deletedAt: null },
      }),
    ])

    let active = 0
    let total = 0
    for (const c of policyCounts) {
      total += c._count._all
      if (c.status === 'ACTIVE') active += c._count._all
    }

    return ClientMapper.toWithMetrics(row, active, total, contactCount)
  }

  async findByDocumentHash(
    documentHash: string,
    organizationId: string
  ): Promise<ClientData | null> {
    const row = await this.prisma.client.findFirst({
      where: { organizationId, documentHash, deletedAt: null },
    })
    return row ? ClientMapper.toDomain(row) : null
  }

  async findMany(
    filters: ClientFilters,
    page: CursorPage<ClientSortField>
  ): Promise<{ items: ClientWithMetrics[]; nextCursor: string | null }> {
    const where: Prisma.ClientWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
    }

    if (filters.search) {
      where.OR = [
        { legalName: { contains: filters.search, mode: 'insensitive' } },
        { document: { contains: filters.search } },
      ]
    }

    if (filters.hasActivePolicy === true) {
      where.policies = { some: { status: 'ACTIVE', deletedAt: null } }
    } else if (filters.hasActivePolicy === false) {
      where.policies = { none: { status: 'ACTIVE', deletedAt: null } }
    }

    const sortBy = page.sortBy ?? 'createdAt'
    const sortOrder = page.sortOrder ?? 'desc'

    const rows = await this.prisma.client.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder }, { id: sortOrder }],
      take: page.limit + 1,
      ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
    })

    const ids = rows.map((r) => r.id)

    const [policyCounts, contactCounts] = await Promise.all([
      ids.length > 0
        ? this.prisma.policy.groupBy({
            by: ['clientId', 'status'],
            where: {
              clientId: { in: ids },
              organizationId: filters.organizationId,
              deletedAt: null,
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      ids.length > 0
        ? this.prisma.contact.groupBy({
            by: ['clientId'],
            where: {
              clientId: { in: ids },
              organizationId: filters.organizationId,
              deletedAt: null,
            },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ])

    const policyMap = new Map<string, { active: number; total: number }>()
    for (const c of policyCounts) {
      const cur = policyMap.get(c.clientId) ?? { active: 0, total: 0 }
      cur.total += c._count._all
      if (c.status === 'ACTIVE') cur.active += c._count._all
      policyMap.set(c.clientId, cur)
    }

    const contactMap = new Map<string, number>()
    for (const c of contactCounts) {
      if (c.clientId) contactMap.set(c.clientId, c._count._all)
    }

    const items = rows.map((row) => {
      const p = policyMap.get(row.id) ?? { active: 0, total: 0 }
      const cc = contactMap.get(row.id) ?? 0
      return ClientMapper.toWithMetrics(row, p.active, p.total, cc)
    })

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
    data: UpdateClientPersistence
  ): Promise<ClientData> {
    const updateData: Prisma.ClientUpdateInput = {}

    if (data.legalName !== undefined) updateData.legalName = data.legalName
    if (data.personType !== undefined) updateData.personType = data.personType
    if (data.profession !== undefined) updateData.profession = data.profession
    if (data.maritalStatus !== undefined) {
      updateData.maritalStatus = data.maritalStatus
    }
    if (data.fiscalBirthDate !== undefined) {
      updateData.fiscalBirthDate = data.fiscalBirthDate
    }
    if (data.address !== undefined) {
      const address: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue =
        data.address === null ? Prisma.JsonNull : toInputJsonValue(data.address)
      updateData.address = address
    }

    const row = await this.prisma.client.update({
      where: { id, organizationId },
      data: updateData,
    })
    return ClientMapper.toDomain(row)
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.prisma.client.update({
      where: { id, organizationId },
      data: { deletedAt: new Date() },
    })
  }

  async lgpdAnonymize(id: string, organizationId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.client.update({
        where: { id, organizationId },
        data: {
          legalName: 'Cliente removido',
          document: '***.***.***-**',
          documentEncrypted: '',
          documentHash: '',
          profession: null,
          maritalStatus: null,
          address: Prisma.JsonNull,
          fiscalBirthDate: null,
          deletedAt: new Date(),
        },
      }),
      // Anonymize audit log snapshots that may contain PII
      this.prisma.auditLog.updateMany({
        where: { entityType: 'Client', entityId: id, organizationId },
        data: { before: Prisma.DbNull, after: Prisma.DbNull },
      }),
    ])
  }
}
