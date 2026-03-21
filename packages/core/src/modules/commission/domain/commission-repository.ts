import type { CursorPage, Page } from '../../client/domain/client-repository.js';
import type { Commission } from './commission.js';
import type { CommissionStatus } from './commission-types.js';

export interface CommissionData {
  id: string;
  organizationId: string;
  policyId: string;
  salespersonId: string;
  status: CommissionStatus;
  commissionValueInCents: number;
  premiumValueInCents: number;
  percentageInBasisPoints: number;
  splitPercentage: number | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  isReversal: boolean;
  originalCommissionId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  salespersonName?: string;
  policyNumber?: string;
  clientName?: string;
}

export interface CommissionFilters {
  organizationId: string;
  status?: CommissionStatus;
  salespersonId?: string;
  policyId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CommissionRepository {
  save(commission: Commission): Promise<CommissionData>;
  findById(id: string, organizationId: string): Promise<CommissionData | null>;
  findMany(filters: CommissionFilters, page: CursorPage): Promise<Page<CommissionData>>;
  update(commission: Commission): Promise<CommissionData>;
}
