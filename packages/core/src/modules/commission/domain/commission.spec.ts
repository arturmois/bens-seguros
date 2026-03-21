import { describe, it, expect } from 'vitest';

import { Commission } from './commission.js';
import { InvalidCommissionTransitionError, CommissionNotPaidError } from './commission-errors.js';

describe('Commission Entity', () => {
  const validProps = {
    organizationId: 'org-1',
    policyId: 'pol-1',
    salespersonId: 'user-1',
    premiumValueInCents: 100000, // R$1000
    percentageInBasisPoints: 1500, // 15%
  };

  it('creates with PENDING_COMMERCIAL status and calculated value', () => {
    const commission = Commission.create(validProps);
    expect(commission.status).toBe('PENDING_COMMERCIAL');
    expect(commission.commissionValueInCents).toBe(15000);
    expect(commission.organizationId).toBe('org-1');
    expect(commission.policyId).toBe('pol-1');
    expect(commission.salespersonId).toBe('user-1');
    expect(commission.id).toBeTruthy();
  });

  it('advances from PENDING_COMMERCIAL to PENDING_ADMIN', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('user-2');
    expect(commission.status).toBe('PENDING_ADMIN');
    expect(commission.approvedByCommercial).toBe('user-2');
  });

  it('advances from PENDING_ADMIN to APPROVED', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('user-2');
    commission.approveByAdmin('admin-1');
    expect(commission.status).toBe('APPROVED');
    expect(commission.approvedBy).toBe('admin-1');
  });

  it('advances from APPROVED to PAID', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('user-2');
    commission.approveByAdmin('admin-1');
    commission.markAsPaid();
    expect(commission.status).toBe('PAID');
    expect(commission.paidAt).toBeInstanceOf(Date);
  });

  it('rejects from PENDING_COMMERCIAL', () => {
    const commission = Commission.create(validProps);
    commission.reject('admin-1', 'Valores incorretos');
    expect(commission.status).toBe('REJECTED');
    expect(commission.rejectionReason).toBe('Valores incorretos');
    expect(commission.rejectedBy).toBe('admin-1');
  });

  it('rejects from PENDING_ADMIN', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('user-2');
    commission.reject('admin-1', 'Sem orcamento');
    expect(commission.status).toBe('REJECTED');
    expect(commission.rejectionReason).toBe('Sem orcamento');
  });

  it('cannot approve from REJECTED', () => {
    const commission = Commission.create(validProps);
    commission.reject('admin-1', 'reason');
    expect(() => commission.approveByCommercial('user-2')).toThrow(
      InvalidCommissionTransitionError,
    );
  });

  it('cannot approve from PAID', () => {
    const commission = Commission.create(validProps);
    commission.approveByCommercial('u');
    commission.approveByAdmin('a');
    commission.markAsPaid();
    expect(() => commission.approveByAdmin('a')).toThrow(InvalidCommissionTransitionError);
  });

  it('cannot pay from PENDING_COMMERCIAL', () => {
    const commission = Commission.create(validProps);
    expect(() => commission.markAsPaid()).toThrow(InvalidCommissionTransitionError);
  });

  it('creates reversal commission', () => {
    const original = Commission.create(validProps);
    original.approveByCommercial('u');
    original.approveByAdmin('a');
    original.markAsPaid();

    const reversal = Commission.createReversal(original);
    expect(reversal.isReversal).toBe(true);
    expect(reversal.originalCommissionId).toBe(original.id);
    expect(reversal.commissionValueInCents).toBe(-15000);
    expect(reversal.status).toBe('PENDING_COMMERCIAL');
  });

  it('cannot reverse unpaid commission', () => {
    const commission = Commission.create(validProps);
    expect(() => Commission.createReversal(commission)).toThrow(CommissionNotPaidError);
  });

  it('calculates with split percentage', () => {
    const commission = Commission.create({
      ...validProps,
      splitPercentageInBasisPoints: 5000, // 50%
    });
    expect(commission.commissionValueInCents).toBe(7500);
  });

  it('restores from persistence data', () => {
    const now = new Date();
    const commission = Commission.restore({
      id: 'comm-1',
      organizationId: 'org-1',
      policyId: 'pol-1',
      salespersonId: 'user-1',
      premiumValueInCents: 100000,
      percentageInBasisPoints: 1500,
      splitPercentageInBasisPoints: 10000,
      commissionValueInCents: 15000,
      status: 'APPROVED',
      approvedByCommercial: 'user-2',
      approvedBy: 'admin-1',
      rejectedBy: null,
      rejectionReason: null,
      paidAt: null,
      isReversal: false,
      originalCommissionId: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(commission.id).toBe('comm-1');
    expect(commission.status).toBe('APPROVED');
    expect(commission.commissionValueInCents).toBe(15000);
    expect(commission.approvedBy).toBe('admin-1');
  });

  it('serializes to JSON', () => {
    const commission = Commission.create(validProps);
    const json = commission.toJSON();
    expect(json.id).toBe(commission.id);
    expect(json.status).toBe('PENDING_COMMERCIAL');
    expect(json.commissionValueInCents).toBe(15000);
  });
});
