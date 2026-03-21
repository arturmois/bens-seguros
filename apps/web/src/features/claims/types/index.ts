export type ClaimStatus =
  | 'REGISTERED'
  | 'IN_ANALYSIS'
  | 'AWAITING_DOCUMENT'
  | 'PENDING_INSPECTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'COMPLETED';

export type ClaimPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export interface ClaimData {
  readonly id: string;
  readonly organizationId: string;
  readonly claimNumber: number;
  readonly policyId: string;
  readonly clientId: string;
  readonly insurerId: string | null;
  readonly assignedToId: string | null;
  readonly status: ClaimStatus;
  readonly priority: ClaimPriority;
  readonly description: string;
  readonly incidentDate: string | null;
  readonly incidentLocation: string | null;
  readonly reportedAt: string;
  readonly resolvedAt: string | null;
  readonly closedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly policyNumber?: string;
  readonly clientName?: string;
  readonly insurerName?: string;
  readonly assignedToName?: string;
}

export interface ClaimFilters {
  readonly status?: ClaimStatus;
  readonly priority?: ClaimPriority;
  readonly policyId?: string;
  readonly clientId?: string;
  readonly search?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface ClaimListMeta {
  readonly total: number;
  readonly nextCursor: string | null;
}

export interface OccurrenceData {
  readonly id: string;
  readonly claimId: string;
  readonly type: string;
  readonly description: string;
  readonly metadata: Record<string, unknown> | null;
  readonly createdBy: string | null;
  readonly createdByName?: string;
  readonly createdAt: string;
}
