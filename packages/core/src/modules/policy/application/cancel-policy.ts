import { injectable, inject } from 'tsyringe'
import type {
  PolicyRepository,
  PolicyData,
} from '../domain/policy-repository.js'
import { PolicyErrors } from '../domain/policy-errors.js'

@injectable()
export class CancelPolicy {
  constructor(
    @inject('PolicyRepository') private readonly policyRepo: PolicyRepository
  ) {}

  async execute(
    id: string,
    organizationId: string,
    reason: string
  ): Promise<PolicyData> {
    const policy = await this.policyRepo.findById(id, organizationId)
    if (!policy) {
      throw PolicyErrors.notFound(id)
    }
    if (policy.status === 'CANCELLED') {
      throw PolicyErrors.alreadyCancelled(id)
    }
    return this.policyRepo.cancel(id, organizationId, reason)
  }
}
