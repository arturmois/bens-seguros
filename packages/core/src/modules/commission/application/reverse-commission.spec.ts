import { describe, it, expect, vi } from 'vitest';
import { ReverseCommission } from './reverse-commission.js';
import type { CommissionRepository, CommissionData } from '../domain/commission-repository.js';
import { CommissionNotFoundError, CommissionNotPaidError } from '../domain/commission-errors.js';

function makeCommissionData(overrides: Partial<CommissionData> = {}): CommissionData {
  return {
    id: 'comm-1',
    organizationId: 'org-1',
    policyId: 'pol-1',
    salespersonId: 'user-1',
    status: 'PAID',
    commissionValueInCents: 15000,
    premiumValueInCents: 100000,
    percentageInBasisPoints: 1500,
    splitPercentage: 10000,
    approvedBy: 'admin-1',
    approvedAt: new Date(),
    paidAt: new Date(),
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    isReversal: false,
    originalCommissionId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockRepo(data: CommissionData | null): CommissionRepository {
  return {
    save: vi.fn().mockImplementation(async (commission) => {
      const json = commission.toJSON();
      return { ...json, splitPercentage: json.splitPercentage } satisfies CommissionData;
    }),
    findById: vi.fn().mockResolvedValue(data),
    findMany: vi.fn(),
    update: vi.fn().mockImplementation(async (commission) => {
      const json = commission.toJSON();
      return { ...json, splitPercentage: json.splitPercentage } satisfies CommissionData;
    }),
  };
}

describe('ReverseCommission', () => {
  it('creates a reversal and marks original as REVERSED', async () => {
    const data = makeCommissionData({ status: 'PAID' });
    const repo = createMockRepo(data);
    const useCase = new ReverseCommission(repo);

    const result = await useCase.execute('comm-1', 'org-1');

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalledTimes(1);

    const savedReversal = vi.mocked(repo.save).mock.calls[0]?.[0];
    expect(savedReversal?.isReversal).toBe(true);
    expect(savedReversal?.originalCommissionId).toBe('comm-1');
    expect(savedReversal?.commissionValueInCents).toBe(-15000);
    expect(savedReversal?.status).toBe('PENDING_COMMERCIAL');

    const updatedOriginal = vi.mocked(repo.update).mock.calls[0]?.[0];
    expect(updatedOriginal?.status).toBe('REVERSED');

    expect(result.reversal.isReversal).toBe(true);
    expect(result.original.status).toBe('REVERSED');
  });

  it('throws CommissionNotFoundError when commission does not exist', async () => {
    const repo = createMockRepo(null);
    const useCase = new ReverseCommission(repo);

    await expect(useCase.execute('missing', 'org-1')).rejects.toThrow(CommissionNotFoundError);
  });

  it('throws CommissionNotPaidError when commission is not PAID', async () => {
    const data = makeCommissionData({ status: 'APPROVED' });
    const repo = createMockRepo(data);
    const useCase = new ReverseCommission(repo);

    await expect(useCase.execute('comm-1', 'org-1')).rejects.toThrow(CommissionNotPaidError);
  });

  it('throws CommissionNotPaidError when commission is PENDING_COMMERCIAL', async () => {
    const data = makeCommissionData({ status: 'PENDING_COMMERCIAL' });
    const repo = createMockRepo(data);
    const useCase = new ReverseCommission(repo);

    await expect(useCase.execute('comm-1', 'org-1')).rejects.toThrow(CommissionNotPaidError);
  });
});
