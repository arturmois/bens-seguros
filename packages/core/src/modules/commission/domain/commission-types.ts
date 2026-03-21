export type CommissionStatus =
  | 'PENDING_COMMERCIAL'
  | 'PENDING_ADMIN'
  | 'APPROVED'
  | 'PAID'
  | 'REJECTED'
  | 'REVERSED';

export interface CommissionProps {
  readonly id: string;
  readonly organizationId: string;
  readonly policyId: string;
  readonly salespersonId: string;
  readonly premiumValueInCents: number;
  readonly percentageInBasisPoints: number;
  readonly splitPercentage: number;
  commissionValueInCents: number;
  status: CommissionStatus;
  approvedBy: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  paidAt: Date | null;
  readonly isReversal: boolean;
  readonly originalCommissionId: string | null;
  deletedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommissionInput {
  organizationId: string;
  policyId: string;
  salespersonId: string;
  premiumValueInCents: number;
  percentageInBasisPoints: number;
  splitPercentage?: number;
}
