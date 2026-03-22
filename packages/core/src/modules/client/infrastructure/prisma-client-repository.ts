import { injectable, inject } from 'tsyringe'
import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import type {
  ClientRepository,
  ClientData,
  ClientFilters,
  CursorPage,
  Page,
  CreateClientInput,
  UpdateClientInput,
} from '../domain/client-repository.js'
import { ClientMapper } from './client-mapper.js'

@injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateClientInput): Promise<ClientData> {
    const row = await this.prisma.client.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        document: data.document,
        type: data.type ?? 'LEAD',
        email: data.email ?? null,
        phone: data.phone ?? null,
        birthDate: data.birthDate ?? null,
        profession: data.profession ?? null,
        maritalStatus: data.maritalStatus ?? null,
        address:
          data.address === null || data.address === undefined
            ? Prisma.JsonNull
            : data.address,
        tags: data.tags ?? [],
        consentLgpd: data.consentLgpd ?? false,
      },
    })

    return ClientMapper.toDomain(row)
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

  async findByDocument(
    document: string,
    organizationId: string
  ): Promise<ClientData | null> {
    const row = await this.prisma.client.findFirst({
      where: { document, organizationId, deletedAt: null },
    })
    return row ? ClientMapper.toDomain(row) : null
  }

  async findMany(
    filters: ClientFilters,
    page: CursorPage
  ): Promise<Page<ClientData>> {
    const where: Prisma.ClientWhereInput = {
      organizationId: filters.organizationId,
      deletedAt: null,
      ...(filters.type && { type: filters.type }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { document: { contains: filters.search } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    }

    const [rows, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        take: page.limit + 1,
        ...(page.cursor && { cursor: { id: page.cursor }, skip: 1 }),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.client.count({ where }),
    ])

    const hasNext = rows.length > page.limit
    const items = hasNext ? rows.slice(0, -1) : rows

    return {
      items: items.map(ClientMapper.toDomain),
      total,
      nextCursor: hasNext ? (items.at(-1)?.id ?? null) : null,
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateClientInput
  ): Promise<ClientData> {
    const updateData: Prisma.ClientUpdateInput = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate
    if (data.profession !== undefined) updateData.profession = data.profession
    if (data.maritalStatus !== undefined)
      updateData.maritalStatus = data.maritalStatus
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.consentLgpd !== undefined)
      updateData.consentLgpd = data.consentLgpd
    if (data.type !== undefined) updateData.type = data.type
    if (data.address !== undefined) {
      updateData.address =
        data.address === null ? Prisma.JsonNull : data.address
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
}
