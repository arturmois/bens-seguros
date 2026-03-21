import { injectable, inject } from 'tsyringe';
import type { PrismaClient } from '@repo/db';
import type {
  DocumentRepository,
  DocumentData,
  DocumentEntityType,
  CreateDocumentInput,
} from '../domain/document-repository.js';
import { DocumentMapper } from './document-mapper.js';

@injectable()
export class PrismaDocumentRepository implements DocumentRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateDocumentInput): Promise<DocumentData> {
    const row = await this.prisma.document.create({
      data: {
        organizationId: data.organizationId,
        entityType: data.entityType,
        entityId: data.entityId,
        clientId: data.clientId ?? null,
        type: data.type ?? 'OTHER',
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        storageKey: data.storageKey,
        url: data.url ?? null,
        createdBy: data.createdBy ?? null,
      },
    });

    return DocumentMapper.toDomain(row);
  }

  async findById(id: string, organizationId: string): Promise<DocumentData | null> {
    const row = await this.prisma.document.findFirst({
      where: { id, organizationId },
    });
    return row ? DocumentMapper.toDomain(row) : null;
  }

  async findByEntity(entityType: DocumentEntityType, entityId: string): Promise<DocumentData[]> {
    const rows = await this.prisma.document.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(DocumentMapper.toDomain);
  }

  async delete(id: string, organizationId: string): Promise<DocumentData | null> {
    try {
      const row = await this.prisma.document.delete({
        where: { id, organizationId },
      });
      return DocumentMapper.toDomain(row);
    } catch {
      return null;
    }
  }
}
