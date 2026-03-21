import { injectable, inject } from 'tsyringe';
import type { PolicyRepository, PolicyData } from '../domain/policy-repository.js';
import { PolicyErrors } from '../domain/policy-errors.js';

@injectable()
export class GetPolicy {
  constructor(@inject('PolicyRepository') private readonly policyRepo: PolicyRepository) {}

  async execute(id: string, organizationId: string): Promise<PolicyData> {
    const policy = await this.policyRepo.findById(id, organizationId);
    if (!policy) {
      throw PolicyErrors.notFound(id);
    }
    return policy;
  }
}
