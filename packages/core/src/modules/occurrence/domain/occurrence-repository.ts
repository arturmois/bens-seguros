export interface OccurrenceData {
  id: string;
  claimId: string;
  type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface CreateOccurrenceInput {
  claimId: string;
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

export interface OccurrenceRepository {
  create(data: CreateOccurrenceInput): Promise<OccurrenceData>;
  findByClaimId(claimId: string): Promise<OccurrenceData[]>;
}
