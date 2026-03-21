import type { Occurrence as PrismaOccurrenceRecord } from '@repo/db';
import type { OccurrenceData } from '../domain/occurrence-repository.js';

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export class OccurrenceMapper {
  static toDomain(row: PrismaOccurrenceRecord): OccurrenceData {
    return {
      id: row.id,
      claimId: row.claimId,
      type: row.type,
      description: row.description,
      metadata: isJsonObject(row.metadata) ? row.metadata : null,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }
}
