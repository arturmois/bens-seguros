export type EndorsementType =
  | 'COVERAGE_CHANGE'
  | 'PREMIUM_ADJUSTMENT'
  | 'DATA_CORRECTION'
  | 'BENEFICIARY_CHANGE'
  | 'OTHER';

export interface EndorsementData {
  readonly id: string;
  readonly organizationId: string;
  readonly policyId: string;
  readonly type: EndorsementType;
  readonly description: string;
  readonly effectiveDate: string;
  readonly previousVersionSnapshot: Record<string, unknown>;
  readonly changes: Record<string, unknown>;
  readonly createdBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly policyNumber?: string;
}

export interface EndorsementFilters {
  readonly policyId?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface EndorsementListMeta {
  readonly total: number;
  readonly nextCursor: string | null;
}
