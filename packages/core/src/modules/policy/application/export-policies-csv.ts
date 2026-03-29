import { injectable, inject } from 'tsyringe'
import type {
  PolicyRepository,
  PolicyFilters,
} from '../domain/policy-repository.js'
import { CSV_BOM, formatCsvRow } from '../../../shared/csv-utils.js'

const BATCH_SIZE = 500

const POLICY_CSV_COLUMNS = [
  'ID',
  'Numero Apolice',
  'Cliente',
  'CPF/CNPJ Cliente',
  'Vendedor',
  'Seguradora',
  'Ramo',
  'Status',
  'Premio (R$)',
  'Inicio Vigencia',
  'Fim Vigencia',
  'Criado em',
]

@injectable()
export class ExportPoliciesCsv {
  constructor(
    @inject('PolicyRepository')
    private readonly policyRepo: PolicyRepository
  ) {}

  async *generateCsvRows(filters: PolicyFilters): AsyncGenerator<string> {
    yield CSV_BOM + POLICY_CSV_COLUMNS.join(',') + '\n'

    let cursor: string | undefined
    let hasMore = true

    while (hasMore) {
      const result = await this.policyRepo.findMany(filters, {
        limit: BATCH_SIZE,
        cursor,
      })

      for (const p of result.items) {
        yield formatCsvRow([
          p.id,
          p.policyNumber,
          p.clientName ?? p.clientId,
          p.clientDocument ?? '',
          p.salespersonName ?? p.salespersonId,
          p.insurerName ?? '',
          p.branch,
          p.status,
          (p.premiumValueInCents / 100).toFixed(2),
          p.startDate.toISOString().split('T')[0] ?? '',
          p.endDate.toISOString().split('T')[0] ?? '',
          p.createdAt.toISOString(),
        ]) + '\n'
      }

      hasMore = result.items.length === BATCH_SIZE
      cursor = result.items.at(-1)?.id
    }
  }
}
