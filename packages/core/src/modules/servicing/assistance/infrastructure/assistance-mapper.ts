import type { Assistance as PrismaAssistanceRecord } from '@repo/db'
import type { AssistanceData } from '../domain/assistance-repository.js'

interface AssistanceRelations {
  policy?: { policyNumber: string } | null
  client?: { legalName: string } | null
}

type AssistanceWithRelations = PrismaAssistanceRecord & AssistanceRelations

export class AssistanceMapper {
  static toDomain(row: AssistanceWithRelations): AssistanceData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      policyId: row.policyId,
      clientId: row.clientId,
      claimId: row.claimId,
      type: row.type,
      status: row.status,
      description: row.description,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      providerName: row.providerName,
      providerPhone: row.providerPhone,
      requestedAt: row.requestedAt,
      scheduledAt: row.scheduledAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      policyNumber: row.policy?.policyNumber,
      clientName: row.client?.legalName,
    }
  }
}
