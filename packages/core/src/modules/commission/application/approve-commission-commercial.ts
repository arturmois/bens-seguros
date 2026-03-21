import { injectable, inject } from 'tsyringe';
import type { CommissionRepository, CommissionData } from '../domain/commission-repository.js';
import { CommissionErrors } from '../domain/commission-errors.js';
import { Commission } from '../domain/commission.js';

@injectable()
export class ApproveCommissionCommercial {
  constructor(
    @inject('CommissionRepository') private readonly commissionRepo: CommissionRepository,
  ) {}

  async execute(id: string, organizationId: string, userId: string): Promise<CommissionData> {
    const data = await this.commissionRepo.findById(id, organizationId);
    if (!data) {
      throw CommissionErrors.notFound(id);
    }

    const commission = Commission.restore({
      ...data,
      splitPercentage: data.splitPercentage ?? 10000,
    });
    commission.approveByCommercial(userId);

    return this.commissionRepo.update(commission);
  }
}
