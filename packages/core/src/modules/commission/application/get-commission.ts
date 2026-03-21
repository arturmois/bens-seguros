import { injectable, inject } from 'tsyringe';
import type { CommissionRepository, CommissionData } from '../domain/commission-repository.js';
import { CommissionErrors } from '../domain/commission-errors.js';

@injectable()
export class GetCommission {
  constructor(
    @inject('CommissionRepository') private readonly commissionRepo: CommissionRepository,
  ) {}

  async execute(id: string, organizationId: string): Promise<CommissionData> {
    const data = await this.commissionRepo.findById(id, organizationId);
    if (!data) {
      throw CommissionErrors.notFound(id);
    }
    return data;
  }
}
