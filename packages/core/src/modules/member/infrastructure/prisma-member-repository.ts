import { injectable, inject } from 'tsyringe'
import type { PrismaClient, Role } from '@repo/db'
import type {
  MemberListPage,
  MemberRepository,
  MemberRecord,
  OrganizationMembership,
} from '../domain/member-repository.js'
import { MEMBER_ROLES, type MemberRole } from '../domain/member-roles.js'

const VALID_ROLE_VALUES: ReadonlySet<string> = new Set(
  Object.values(MEMBER_ROLES)
)

function toPrismaRole(value: string): Role {
  if (VALID_ROLE_VALUES.has(value)) return value as Role
  throw new Error(`Invalid role value: ${value}`)
}

type MemberRow = {
  readonly id: string
  readonly userId: string
  readonly organizationId: string
  readonly role: Role
  readonly active: boolean
}

function toMemberRecord(row: MemberRow): MemberRecord {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    role: row.role as MemberRole,
    active: row.active,
  }
}

@injectable()
export class PrismaMemberRepository implements MemberRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async findById(
    id: string,
    organizationId: string
  ): Promise<MemberRecord | null> {
    const row = await this.prisma.member.findFirst({
      where: { id, organizationId, active: true },
    })
    return row ? toMemberRecord(row) : null
  }

  async countByRole(organizationId: string, role: string): Promise<number> {
    return this.prisma.member.count({
      where: { organizationId, role: toPrismaRole(role), active: true },
    })
  }

  async updateRole(
    id: string,
    organizationId: string,
    role: string
  ): Promise<MemberRecord> {
    const row = await this.prisma.member.update({
      where: { id, organizationId },
      data: { role: toPrismaRole(role) },
    })
    return toMemberRecord(row)
  }

  async deactivate(id: string, organizationId: string): Promise<void> {
    await this.prisma.member.update({
      where: { id, organizationId },
      data: { active: false },
    })
  }

  async listOrganizationsForUser(
    userId: string
  ): Promise<OrganizationMembership[]> {
    const rows = await this.prisma.member.findMany({
      where: { userId, active: true },
      include: { organization: true },
    })
    return rows.map((row) => ({
      id: row.organization.id,
      name: row.organization.name,
      slug: row.organization.slug,
      logo: row.organization.logo,
      role: row.role,
    }))
  }

  async listActive(
    organizationId: string,
    options: { limit: number; cursor?: string }
  ): Promise<MemberListPage> {
    const where = {
      organizationId,
      active: true,
      ...(options.cursor ? { id: { gt: options.cursor } } : {}),
    }
    const [rows, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { id: 'asc' },
        take: options.limit + 1,
      }),
      this.prisma.member.count({ where: { organizationId, active: true } }),
    ])
    const hasMore = rows.length > options.limit
    if (hasMore) rows.pop()
    const items = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
      role: row.role,
      active: row.active,
      createdAt: row.createdAt,
    }))
    const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null
    return { items, total, nextCursor }
  }
}
