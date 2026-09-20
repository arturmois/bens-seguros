import type { Contact as PrismaContactRecord } from '@repo/db'
import type {
  ContactData,
  ContactStage,
  ContactWithStage,
} from '../domain/contact-repository.js'

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export class ContactMapper {
  static toDomain(row: PrismaContactRecord): ContactData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      phone: row.phone,
      email: row.email,
      source: row.source,
      salespersonId: row.salespersonId,
      clientId: row.clientId,
      tags: row.tags,
      socialMedia: isJsonObject(row.socialMedia) ? row.socialMedia : null,
      notes: row.notes,
      consentLgpd: row.consentLgpd,
      birthDate: row.birthDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    }
  }

  static deriveStage(
    clientId: string | null,
    activePolicyCount: number,
    totalPolicyCount: number
  ): ContactStage {
    if (!clientId) return 'LEAD'
    if (activePolicyCount > 0) return 'CLIENT_ACTIVE'
    if (totalPolicyCount > 0) return 'CLIENT_INACTIVE'
    return 'CLIENT_NEW'
  }

  static toWithStage(
    row: PrismaContactRecord,
    activePolicyCount: number,
    totalPolicyCount: number
  ): ContactWithStage {
    return {
      ...ContactMapper.toDomain(row),
      stage: ContactMapper.deriveStage(
        row.clientId,
        activePolicyCount,
        totalPolicyCount
      ),
      activePolicyCount,
    }
  }
}
