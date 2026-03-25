import { injectable, inject } from 'tsyringe'
import type {
  CommissionRepository,
  CommissionFilters,
} from '../domain/commission-repository.js'
import {
  MAX_EXPORT_ROWS,
  CSV_BOM,
  escapeCsvField,
} from '../../../shared/csv-utils.js'

@injectable()
export class ExportCommissionsCsv {
  constructor(
    @inject('CommissionRepository')
    private readonly commissionRepo: CommissionRepository
  ) {}

  async execute(filters: CommissionFilters): Promise<string> {
    const { items } = await this.commissionRepo.findMany(filters, {
      limit: MAX_EXPORT_ROWS,
    })

    const header = 'ID,Apolice,Vendedor,Premio,Percentual,Valor,Status,Data\n'
    const rows = items
      .map((c) =>
        [
          c.id,
          escapeCsvField(c.policyNumber ?? c.policyId),
          escapeCsvField(c.salespersonName ?? c.salespersonId),
          (c.premiumValueInCents / 100).toFixed(2),
          (c.percentageInBasisPoints / 100).toFixed(2) + '%',
          (c.commissionValueInCents / 100).toFixed(2),
          c.status,
          c.createdAt.toISOString(),
        ].join(',')
      )
      .join('\n')

    return CSV_BOM + header + rows
  }
}
