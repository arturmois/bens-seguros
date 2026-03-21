import type { Endorsement as PrismaEndorsementRecord } from '@repo/db';
import type { EndorsementData } from '../domain/endorsement-repository.js';
import type { JsonObject } from '../../occurrence/domain/occurrence-repository.js';

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

interface EndorsementRelations {
  policy?: { policyNumber: string } | null;
}

type EndorsementWithRelations = PrismaEndorsementRecord & EndorsementRelations;

export class EndorsementMapper {
  static toDomain(row: EndorsementWithRelations): EndorsementData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      policyId: row.policyId,
      type: row.type,
      description: row.description,
      effectiveDate: row.effectiveDate,
      previousVersionSnapshot: isJsonObject(row.previousVersionSnapshot)
        ? row.previousVersionSnapshot
        : {},
      changes: isJsonObject(row.changes) ? row.changes : {},
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      policyNumber: row.policy?.policyNumber,
    };
  }
}
