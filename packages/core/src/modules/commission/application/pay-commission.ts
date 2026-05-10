import { inject, injectable } from 'tsyringe'
import { CommissionErrors } from '../domain/commission-errors.js'
import type {
  CommissionData,
  CommissionRepository,
} from '../domain/commission-repository.js'
import { Commission } from '../domain/commission.js'

@injectable()
export class PayCommission {
  constructor(
    @inject('CommissionRepository')
    private readonly commissionRepo: CommissionRepository
  ) {}

  async execute(id: string, organizationId: string): Promise<CommissionData> {
    const data = await this.commissionRepo.findById(id, organizationId)
    if (!data) {
      throw CommissionErrors.notFound(id)
    }
    const commission = Commission.restore({
      ...data,
      splitPercentage: data.splitPercentage ?? 10000,
    })
    commission.markAsPaid()
    return this.commissionRepo.update(commission)
  }
}
