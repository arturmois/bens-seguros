import type { Insurer as PrismaInsurerRecord } from '@repo/db';
import type { InsurerData } from '../domain/insurer-repository.js';

export class InsurerMapper {
  static toDomain(row: PrismaInsurerRecord): InsurerData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      code: row.code,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
