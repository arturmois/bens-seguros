import { injectable, inject } from 'tsyringe'
import type {
  CommissionRepository,
  CommissionFilters,
} from '../domain/commission-repository.js'
import { CSV_BOM, escapeCsvField } from '../../../shared/csv-utils.js'

const BATCH_SIZE = 500

const COMMISSION_CSV_HEADER =
  'ID,Apolice,Vendedor,Premio,Percentual,Valor,Status,Data\n'

@injectable()
export class ExportCommissionsCsv {
  constructor(
    @inject('CommissionRepository')
    private readonly commissionRepo: CommissionRepository
  ) {}

  async *generateCsvRows(filters: CommissionFilters): AsyncGenerator<string> {
    yield CSV_BOM + COMMISSION_CSV_HEADER

    let cursor: string | undefined
    let hasMore = true

    while (hasMore) {
      const result = await this.commissionRepo.findMany(filters, {
        limit: BATCH_SIZE,
        cursor,
      })

      for (const c of result.items) {
        yield [
          c.id,
          escapeCsvField(c.policyNumber ?? c.policyId),
          escapeCsvField(c.salespersonName ?? c.salespersonId),
          (c.premiumValueInCents / 100).toFixed(2),
          (c.percentageInBasisPoints / 100).toFixed(2) + '%',
          (c.commissionValueInCents / 100).toFixed(2),
          c.status,
          c.createdAt.toISOString(),
        ].join(',') + '\n'
      }

      hasMore = result.items.length === BATCH_SIZE
      cursor = result.items.at(-1)?.id
    }
  }
}
