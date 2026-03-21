import { injectable, inject } from 'tsyringe';
import type { CursorPage, Page } from '../../client/domain/client-repository.js';
import type {
  CommissionRepository,
  CommissionData,
  CommissionFilters,
} from '../domain/commission-repository.js';

@injectable()
export class ListCommissions {
  constructor(
    @inject('CommissionRepository') private readonly commissionRepo: CommissionRepository,
  ) {}

  async execute(filters: CommissionFilters, page: CursorPage): Promise<Page<CommissionData>> {
    return this.commissionRepo.findMany(filters, page);
  }
}
