import type { Policy as PrismaPolicyRecord } from '@repo/db'
import type {
  PolicyData,
  CoverageDetails,
} from '../domain/policy-repository.js'

interface PolicyRelations {
  client?: { name: string; document: string } | null
  salesperson?: { name: string } | null
  insurer?: { name: string } | null
  proposal?: { id: string; details: unknown; boardType: string } | null
}

type PolicyWithRelations = PrismaPolicyRecord & PolicyRelations

function isCoverageObject(value: unknown): value is CoverageDetails {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isJsonDetails(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

function extractProposalDetails(
  value: unknown
): Record<string, unknown> | null {
  if (isJsonDetails(value)) {
    return value
  }
  return null
}

export class PolicyMapper {
  static toDomain(row: PolicyWithRelations): PolicyData {
    const proposalDetails = extractProposalDetails(row.proposal?.details)
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
      proposalDetails,
      boardType: row.proposal?.boardType,
    }
  }
}
