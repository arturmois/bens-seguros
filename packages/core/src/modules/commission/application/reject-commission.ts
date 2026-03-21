import { injectable, inject } from 'tsyringe';
import type { CommissionRepository, CommissionData } from '../domain/commission-repository.js';
import { CommissionErrors } from '../domain/commission-errors.js';
import { Commission } from '../domain/commission.js';

interface RejectCommissionInput {
  id: string;
  organizationId: string;
  userId: string;
  reason: string;
}

@injectable()
export class RejectCommission {
  constructor(
    @inject('CommissionRepository') private readonly commissionRepo: CommissionRepository,
  ) {}

  async execute(input: RejectCommissionInput): Promise<CommissionData> {
    const data = await this.commissionRepo.findById(input.id, input.organizationId);
    if (!data) {
      throw CommissionErrors.notFound(input.id);
    }

    const commission = Commission.restore({
      ...data,
      splitPercentage: data.splitPercentage ?? 10000,
    });
    commission.reject(input.userId, input.reason);

    return this.commissionRepo.update(commission);
  }
}
