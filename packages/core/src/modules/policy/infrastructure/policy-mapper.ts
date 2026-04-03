import type { Policy as PrismaPolicyRecord } from '@repo/db'
import type {
  PolicyData,
  CoverageDetails,
} from '../domain/policy-repository.js'

interface PolicyRelations {
  client?: { name: string; document: string } | null
  salesperson?: { name: string } | null
  insurer?: { name: string } | null
  proposal?: { id: string } | null
}

type PolicyWithRelations = PrismaPolicyRecord & PolicyRelations

function isCoverageObject(value: unknown): value is CoverageDetails {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export class PolicyMapper {
  static toDomain(row: PolicyWithRelations): PolicyData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      proposalId: row.proposalId,
      clientId: row.clientId,
      salespersonId: row.salespersonId,
      insurerId: row.insurerId,
      policyNumber: row.policyNumber,
      status: row.status,
      branch: row.branch,
      premiumValueInCents: row.premiumValueInCents,
      coverageDetails: isCoverageObject(row.coverageDetails)
        ? row.coverageDetails
        : null,
      startDate: row.startDate,
      endDate: row.endDate,
      cancelledAt: row.cancelledAt,
      cancelReason: row.cancelReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      clientName: row.client?.name,
      clientDocument: row.client?.document,
      salespersonName: row.salesperson?.name,
      insurerName: row.insurer?.name,
      proposalIdentifier: row.proposal?.id,
    }
  }
}
