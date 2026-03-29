import { injectable, inject } from 'tsyringe'
import type {
  CommissionRepository,
  CommissionData,
} from '../domain/commission-repository.js'
import { CommissionErrors } from '../domain/commission-errors.js'
import { Commission } from '../domain/commission.js'

interface ReverseCommissionResult {
  reversal: CommissionData
  original: CommissionData
}

@injectable()
export class ReverseCommission {
  constructor(
    @inject('CommissionRepository')
    private readonly commissionRepo: CommissionRepository
  ) {}

  async execute(
    id: string,
    organizationId: string
  ): Promise<ReverseCommissionResult> {
    const data = await this.commissionRepo.findById(id, organizationId)
    if (!data) {
      throw CommissionErrors.notFound(id)
    }

    const original = Commission.restore({
      ...data,
      splitPercentage: data.splitPercentage ?? 10000,
    })

    const reversal = Commission.createReversal(original)
    original.markAsReversed()

    const { savedOriginal, savedReversal } =
      await this.commissionRepo.reverseAtomic(original, reversal)

    return { reversal: savedReversal, original: savedOriginal }
  }
}
