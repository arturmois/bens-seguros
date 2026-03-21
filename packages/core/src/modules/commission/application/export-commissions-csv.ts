import { injectable, inject } from 'tsyringe';
import type { CommissionRepository, CommissionFilters } from '../domain/commission-repository.js';

const MAX_EXPORT_ROWS = 10000;

@injectable()
export class ExportCommissionsCsv {
  constructor(
    @inject('CommissionRepository') private readonly commissionRepo: CommissionRepository,
  ) {}

  async execute(filters: CommissionFilters): Promise<string> {
    const { items } = await this.commissionRepo.findMany(filters, { limit: MAX_EXPORT_ROWS });

    const header = 'ID,Apolice,Vendedor,Premio,Percentual,Valor,Status,Data\n';
    const rows = items
      .map((c) =>
        [
          c.id,
          c.policyNumber ?? c.policyId,
          c.salespersonName ?? c.salespersonId,
          (c.premiumValueInCents / 100).toFixed(2),
          (c.percentageInBasisPoints / 100).toFixed(2) + '%',
          (c.commissionValueInCents / 100).toFixed(2),
          c.status,
          c.createdAt.toISOString(),
        ].join(','),
      )
      .join('\n');

    return header + rows;
  }
}
