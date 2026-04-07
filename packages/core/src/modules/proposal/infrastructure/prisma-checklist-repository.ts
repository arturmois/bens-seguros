import type { PrismaClient } from '@repo/db'
import type {
  ChecklistRepository,
  ChecklistItemData,
  ChecklistSummary,
} from '../domain/checklist-repository.js'

interface ChecklistRow {
  id: string
  organizationId: string
  proposalId: string
  itemKey: string
  label: string
  isRequired: boolean
  isCompleted: boolean
  completedAt: Date | null
  completedBy: string | null
  createdAt: Date
}

function toData(row: ChecklistRow): ChecklistItemData {
  return {
    id: row.id,
    proposalId: row.proposalId,
    itemKey: row.itemKey,
    label: row.label,
    isRequired: row.isRequired,
    isCompleted: row.isCompleted,
    completedAt: row.completedAt,
    completedBy: row.completedBy,
    createdAt: row.createdAt,
  }
}

function computeSummary(rows: ChecklistRow[]): ChecklistSummary {
  const total = rows.length
  const completed = rows.filter((r) => r.isCompleted).length
  const required = rows.filter((r) => r.isRequired).length
  const requiredCompleted = rows.filter(
    (r) => r.isRequired && r.isCompleted
  ).length
  return {
    total,
    completed,
    required,
    requiredCompleted,
    canAdvance: required === 0 || requiredCompleted >= required,
  }
}

export class PrismaChecklistRepository implements ChecklistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMany(
    proposalId: string,
    organizationId: string,
    items: Array<{ itemKey: string; label: string; isRequired: boolean }>
  ): Promise<void> {
    await this.prisma.proposalChecklistItem.createMany({
      data: items.map((item) => ({
        proposalId,
        organizationId,
        itemKey: item.itemKey,
        label: item.label,
        isRequired: item.isRequired,
      })),
      skipDuplicates: true,
    })
  }

  async findByProposal(proposalId: string): Promise<ChecklistItemData[]> {
    const rows = await this.prisma.proposalChecklistItem.findMany({
      where: { proposalId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toData)
  }

  async findById(
    id: string,
    proposalId: string
  ): Promise<ChecklistItemData | null> {
    const row = await this.prisma.proposalChecklistItem.findFirst({
      where: { id, proposalId },
    })
    return row ? toData(row) : null
  }

  async complete(
    id: string,
    proposalId: string,
    userId: string
  ): Promise<ChecklistItemData> {
    const item = await this.prisma.proposalChecklistItem.findFirst({
      where: { id, proposalId },
    })
    if (!item) {
      throw new Error(
        `Checklist item ${id} not found for proposal ${proposalId}`
      )
    }
    const updated = await this.prisma.proposalChecklistItem.update({
      where: { id },
      data: { isCompleted: true, completedAt: new Date(), completedBy: userId },
    })
    return toData(updated)
  }

  async getSummary(proposalId: string): Promise<ChecklistSummary> {
    const rows = await this.prisma.proposalChecklistItem.findMany({
      where: { proposalId },
    })
    return computeSummary(rows)
  }
}
