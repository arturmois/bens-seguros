import { injectable, inject } from 'tsyringe';
import type { PrismaClient } from '@repo/db';
import { Prisma } from '@repo/db';
import type {
  OccurrenceRepository,
  OccurrenceData,
  CreateOccurrenceInput,
} from '../domain/occurrence-repository.js';
import { OccurrenceMapper } from './occurrence-mapper.js';

@injectable()
export class PrismaOccurrenceRepository implements OccurrenceRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async create(data: CreateOccurrenceInput): Promise<OccurrenceData> {
    const row = await this.prisma.occurrence.create({
      data: {
        claimId: data.claimId,
        type: data.type,
        description: data.description,
        metadata:
          data.metadata === undefined || data.metadata === null ? Prisma.JsonNull : data.metadata,
        createdBy: data.createdBy ?? null,
      },
    });

    return OccurrenceMapper.toDomain(row);
  }

  async findByClaimId(claimId: string): Promise<OccurrenceData[]> {
    const rows = await this.prisma.occurrence.findMany({
      where: { claimId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(OccurrenceMapper.toDomain);
  }
}
