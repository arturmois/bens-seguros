import type { Policy as PrismaPolicyRecord } from '@repo/db';
import type { PolicyData, CoverageDetails } from '../domain/policy-repository.js';

function isCoverageObject(value: unknown): value is CoverageDetails {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class PolicyMapper {
  static toDomain(row: PrismaPolicyRecord): PolicyData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      proposalId: row.proposalId,
      clientId: row.clientId,
      salespersonId: row.salespersonId,
      policyNumber: row.policyNumber,
      status: row.status,
      branch: row.branch,
      premiumValueInCents: row.premiumValueInCents,
      coverageDetails: isCoverageObject(row.coverageDetails) ? row.coverageDetails : null,
      startDate: row.startDate,
      endDate: row.endDate,
      cancelledAt: row.cancelledAt,
      cancelReason: row.cancelReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
