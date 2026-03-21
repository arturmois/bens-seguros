import { randomUUID } from 'node:crypto';

import { calculateCommissionValue } from './commission-calculator.js';
import { CommissionErrors } from './commission-errors.js';
import type {
  CommissionProps,
  CommissionStatus,
  CreateCommissionInput,
} from './commission-types.js';

export type { CommissionProps, CommissionStatus, CreateCommissionInput };

const REJECTABLE_STATUSES: ReadonlySet<CommissionStatus> = new Set([
  'PENDING_COMMERCIAL',
  'PENDING_ADMIN',
]);

export class Commission {
  private constructor(private readonly props: CommissionProps) {}

  static create(input: CreateCommissionInput): Commission {
    const split = input.splitPercentageInBasisPoints ?? 10000;
    const value = calculateCommissionValue(
      input.premiumValueInCents,
      input.percentageInBasisPoints,
      split,
    );
    return new Commission({
      id: randomUUID(),
      organizationId: input.organizationId,
      policyId: input.policyId,
      salespersonId: input.salespersonId,
      premiumValueInCents: input.premiumValueInCents,
      percentageInBasisPoints: input.percentageInBasisPoints,
      splitPercentageInBasisPoints: split,
      commissionValueInCents: value,
      status: 'PENDING_COMMERCIAL',
      approvedByCommercial: null,
      approvedBy: null,
      rejectedBy: null,
      rejectionReason: null,
      paidAt: null,
      isReversal: false,
      originalCommissionId: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static createReversal(original: Commission): Commission {
    if (original.status !== 'PAID') {
      throw CommissionErrors.notPaid(original.id);
    }
    return new Commission({
      id: randomUUID(),
      organizationId: original.organizationId,
      policyId: original.policyId,
      salespersonId: original.salespersonId,
      premiumValueInCents: original.premiumValueInCents,
      percentageInBasisPoints: original.percentageInBasisPoints,
      splitPercentageInBasisPoints: original.splitPercentageInBasisPoints,
      commissionValueInCents: -original.commissionValueInCents,
      status: 'PENDING_COMMERCIAL',
      approvedByCommercial: null,
      approvedBy: null,
      rejectedBy: null,
      rejectionReason: null,
      paidAt: null,
      isReversal: true,
      originalCommissionId: original.id,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static restore(props: CommissionProps): Commission {
    return new Commission(props);
  }

  approveByCommercial(userId: string): void {
    if (this.props.status !== 'PENDING_COMMERCIAL') {
      throw CommissionErrors.invalidTransition(this.props.status, 'aprovar comercialmente');
    }
    this.props.approvedByCommercial = userId;
    this.props.status = 'PENDING_ADMIN';
    this.props.updatedAt = new Date();
  }

  approveByAdmin(userId: string): void {
    if (this.props.status !== 'PENDING_ADMIN') {
      throw CommissionErrors.invalidTransition(this.props.status, 'aprovar administrativamente');
    }
    this.props.approvedBy = userId;
    this.props.status = 'APPROVED';
    this.props.updatedAt = new Date();
  }

  markAsPaid(): void {
    if (this.props.status !== 'APPROVED') {
      throw CommissionErrors.invalidTransition(this.props.status, 'marcar como paga');
    }
    this.props.status = 'PAID';
    this.props.paidAt = new Date();
    this.props.updatedAt = new Date();
  }

  reject(userId: string, reason: string): void {
    if (!REJECTABLE_STATUSES.has(this.props.status)) {
      throw CommissionErrors.invalidTransition(this.props.status, 'rejeitar');
    }
    this.props.rejectedBy = userId;
    this.props.rejectionReason = reason;
    this.props.status = 'REJECTED';
    this.props.updatedAt = new Date();
  }

  get id(): string {
    return this.props.id;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get policyId(): string {
    return this.props.policyId;
  }
  get salespersonId(): string {
    return this.props.salespersonId;
  }
  get premiumValueInCents(): number {
    return this.props.premiumValueInCents;
  }
  get percentageInBasisPoints(): number {
    return this.props.percentageInBasisPoints;
  }
  get splitPercentageInBasisPoints(): number {
    return this.props.splitPercentageInBasisPoints;
  }
  get commissionValueInCents(): number {
    return this.props.commissionValueInCents;
  }
  get status(): CommissionStatus {
    return this.props.status;
  }
  get approvedByCommercial(): string | null {
    return this.props.approvedByCommercial;
  }
  get approvedBy(): string | null {
    return this.props.approvedBy;
  }
  get rejectedBy(): string | null {
    return this.props.rejectedBy;
  }
  get rejectionReason(): string | null {
    return this.props.rejectionReason;
  }
  get paidAt(): Date | null {
    return this.props.paidAt;
  }
  get isReversal(): boolean {
    return this.props.isReversal;
  }
  get originalCommissionId(): string | null {
    return this.props.originalCommissionId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): CommissionProps {
    return { ...this.props };
  }
}
