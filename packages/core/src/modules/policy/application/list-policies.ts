import { injectable, inject } from 'tsyringe';
import type {
  PolicyRepository,
  PolicyFilters,
  PolicyCursorPage,
  PolicyPage,
} from '../domain/policy-repository.js';

@injectable()
export class ListPolicies {
  constructor(@inject('PolicyRepository') private readonly policyRepo: PolicyRepository) {}

  async execute(filters: PolicyFilters, page: PolicyCursorPage): Promise<PolicyPage> {
    return this.policyRepo.findMany(filters, page);
  }
}
