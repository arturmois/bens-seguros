import type { Commission as PrismaCommissionRecord, CommissionStatus } from '@repo/db';
import type { CommissionData } from '../domain/commission-repository.js';
import type { CommissionProps } from '../domain/commission-types.js';

interface CommissionRelations {
  salesperson?: { name: string } | null;
  policy?: { policyNumber: string; client?: { name: string } | null } | null;
}

type CommissionWithRelations = PrismaCommissionRecord & CommissionRelations;

export class CommissionMapper {
  static toData(row: CommissionWithRelations): CommissionData {
    return {
      id: row.id,
      organizationId: row.organizationId,
      policyId: row.policyId,
      salespersonId: row.salespersonId,
      status: row.status,
      commissionValueInCents: row.commissionValueInCents,
      premiumValueInCents: row.premiumValueInCents,
      percentageInBasisPoints: row.percentageInBasisPoints,
      splitPercentage: row.splitPercentage,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
      paidAt: row.paidAt,
      rejectedBy: row.rejectedBy,
      rejectedAt: row.rejectedAt,
      rejectionReason: row.rejectionReason,
      isReversal: row.isReversal,
      originalCommissionId: row.originalCommissionId,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      salespersonName: row.salesperson?.name,
      policyNumber: row.policy?.policyNumber,
      clientName: row.policy?.client?.name,
    };
  }

  static toPersistence(props: CommissionProps): {
    id: string;
    organizationId: string;
    policyId: string;
    salespersonId: string;
    status: CommissionStatus;
    commissionValueInCents: number;
    premiumValueInCents: number;
    percentageInBasisPoints: number;
    splitPercentage: number;
    approvedBy: string | null;
    approvedAt: Date | null;
    paidAt: Date | null;
    rejectedBy: string | null;
    rejectedAt: Date | null;
    rejectionReason: string | null;
    isReversal: boolean;
    originalCommissionId: string | null;
    deletedAt: Date | null;
  } {
    return {
      id: props.id,
      organizationId: props.organizationId,
      policyId: props.policyId,
      salespersonId: props.salespersonId,
      status: props.status,
      commissionValueInCents: props.commissionValueInCents,
      premiumValueInCents: props.premiumValueInCents,
      percentageInBasisPoints: props.percentageInBasisPoints,
      splitPercentage: props.splitPercentage,
      approvedBy: props.approvedBy,
      approvedAt: props.approvedAt,
      paidAt: props.paidAt,
      rejectedBy: props.rejectedBy,
      rejectedAt: props.rejectedAt,
      rejectionReason: props.rejectionReason,
      isReversal: props.isReversal,
      originalCommissionId: props.originalCommissionId,
      deletedAt: props.deletedAt,
    };
  }
}
