import { injectable, inject } from 'tsyringe'
import type {
  CommissionRepository,
  CommissionData,
} from '../domain/commission-repository.js'
import { Commission } from '../domain/commission.js'
import type { CreateCommissionInput } from '../domain/commission-types.js'

@injectable()
export class CreateCommission {
  constructor(
    @inject('CommissionRepository')
    private readonly commissionRepo: CommissionRepository
  ) {}

  async execute(input: CreateCommissionInput): Promise<CommissionData> {
    const commission = Commission.create(input)
    return this.commissionRepo.save(commission)
  }
}
