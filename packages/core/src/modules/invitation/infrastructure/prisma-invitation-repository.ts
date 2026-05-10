import type { PrismaClient, Role } from '@repo/db'
import type {
  InvitationDetail,
  InvitationListPage,
  InvitationRecord,
  InvitationRepository,
} from '../domain/invitation-repository.js'

const VALID_ROLES: ReadonlySet<string> = new Set([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'COMMERCIAL',
  'VIEWER',
])

function toRole(value: string): Role {
  if (VALID_ROLES.has(value)) return value as Role
  throw new Error(`Invalid role value: ${value}`)
}

export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<InvitationRecord | null> {
    const row = await this.prisma.invitation.findUnique({ where: { id } })
    if (!row) return null
    return {
      id: row.id,
      email: row.email,
      organizationId: row.organizationId,
      role: row.role,
      status: row.status,
      expiresAt: row.expiresAt,
    }
  }

  async isMember(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    })
    return member !== null && member.active === true
  }

  async acceptAndCreateMember(
    invitationId: string,
    userId: string,
    organizationId: string,
    role: string
  ): Promise<void> {
    const memberRole = toRole(role)
    await this.prisma.$transaction([
      this.prisma.member.upsert({
        where: { organizationId_userId: { organizationId, userId } },
        create: { organizationId, userId, role: memberRole },
        update: { role: memberRole, active: true },
      }),
      this.prisma.invitation.update({
        where: { id: invitationId },
        data: { status: 'accepted' },
      }),
    ])
  }

  async listPending(
    organizationId: string,
    options: { limit: number; cursor?: string }
  ): Promise<InvitationListPage> {
    const now = new Date()
    const baseWhere = {
      organizationId,
      status: 'pending',
      expiresAt: { gt: now },
    } as const
    const where = options.cursor
      ? { ...baseWhere, id: { gt: options.cursor } }
      : baseWhere
    const [rows, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        orderBy: { id: 'asc' },
        take: options.limit + 1,
      }),
      this.prisma.invitation.count({ where: baseWhere }),
    ])
    const hasMore = rows.length > options.limit
    if (hasMore) rows.pop()
    const items: InvitationDetail[] = rows.map((row) => ({
      id: row.id,
      email: row.email,
      organizationId: row.organizationId,
      role: row.role,
      status: row.status,
      expiresAt: row.expiresAt,
      inviterId: row.inviterId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
    const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null
    return { items, total, nextCursor }
  }

  async cancelPending(
    id: string,
    organizationId: string
  ): Promise<InvitationDetail | null> {
    const row = await this.prisma.invitation.findFirst({
      where: { id, organizationId, status: 'pending' },
    })
    if (!row) return null
    const updated = await this.prisma.invitation.update({
      where: { id },
      data: { status: 'canceled' },
    })
    return {
      id: updated.id,
      email: updated.email,
      organizationId: updated.organizationId,
      role: updated.role,
      status: updated.status,
      expiresAt: updated.expiresAt,
      inviterId: updated.inviterId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    }
  }
}
