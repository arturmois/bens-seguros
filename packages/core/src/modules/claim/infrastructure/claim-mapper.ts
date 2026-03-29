import type { Claim as PrismaClaimRecord } from '@repo/db'
import type { ClaimData } from '../domain/claim-repository.js'

interface ClaimRelations {
  policy?: { policyNumber: string } | null
  client?: { name: string } | null
  insurer?: { name: string } | null
  assignedTo?: { name: string } | null
}

type ClaimWithRelations = PrismaClaimRecord & ClaimRelations

export class ClaimMapper {
  static toDomain(row: ClaimWithRelations): ClaimData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      claimNumber: row.claimNumber,
      policyId: row.policyId,
      clientId: row.clientId,
      insurerId: row.insurerId,
      assignedToId: row.assignedToId,
      status: row.status,
      priority: row.priority,
      description: row.description,
      estimatedValueInCents: row.estimatedValueInCents,
      incidentDate: row.incidentDate,
      incidentLocation: row.incidentLocation,
      reportedAt: row.reportedAt,
      resolvedAt: row.resolvedAt,
      closedAt: row.closedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      policyNumber: row.policy?.policyNumber,
      clientName: row.client?.name,
      insurerName: row.insurer?.name,
      assignedToName: row.assignedTo?.name,
    }
  }
}
