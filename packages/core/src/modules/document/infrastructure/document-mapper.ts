import type { Document as PrismaDocumentRecord } from '@repo/db';
import type { DocumentData } from '../domain/document-repository.js';

export class DocumentMapper {
  static toDomain(row: PrismaDocumentRecord): DocumentData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      entityType: row.entityType,
      entityId: row.entityId,
      clientId: row.clientId,
      type: row.type,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      storageKey: row.storageKey,
      url: row.url,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }
}
