import { injectable, inject } from 'tsyringe'
import type {
  PolicyRepository,
  PolicyFilters,
} from '../domain/policy-repository.js'
import {
  MAX_EXPORT_ROWS,
  CSV_BOM,
  formatCsvRow,
} from '../../../shared/csv-utils.js'

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

  async execute(filters: PolicyFilters): Promise<string> {
    const { items } = await this.policyRepo.findMany(filters, {
      limit: MAX_EXPORT_ROWS,
    })

    const header = POLICY_CSV_COLUMNS.join(',') + '\n'
    const rows = items
      .map((p) =>
        formatCsvRow([
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
        ])
      )
      .join('\n')

    return CSV_BOM + header + rows
  }
}
