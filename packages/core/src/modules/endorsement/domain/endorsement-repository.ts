import type { CursorPage, Page } from '../../client/domain/client-repository.js';

export interface EndorsementData {
  id: string;
  organizationId: string;
  policyId: string;
  type: string;
  description: string;
  effectiveDate: Date;
  previousVersionSnapshot: Record<string, unknown>;
  changes: Record<string, unknown>;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  policyNumber?: string;
}

export interface EndorsementFilters {
  organizationId: string;
  policyId?: string;
}

export interface CreateEndorsementInput {
  organizationId: string;
  policyId: string;
  type: string;
  description: string;
  effectiveDate: Date;
  previousVersionSnapshot: Record<string, unknown>;
  changes: Record<string, unknown>;
  createdBy?: string;
}

export interface EndorsementRepository {
  create(data: CreateEndorsementInput): Promise<EndorsementData>;
  findById(id: string, organizationId: string): Promise<EndorsementData | null>;
  findMany(filters: EndorsementFilters, page: CursorPage): Promise<Page<EndorsementData>>;
}
