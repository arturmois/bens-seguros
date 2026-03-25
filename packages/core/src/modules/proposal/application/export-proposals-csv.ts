import { injectable, inject } from 'tsyringe'
import type {
  ProposalRepository,
  ProposalFilters,
} from '../domain/proposal-repository.js'
import { MAX_EXPORT_ROWS, formatCsvRow } from '../../../shared/csv-utils.js'

const PROPOSAL_CSV_COLUMNS = [
  'ID',
  'Cliente',
  'CPF/CNPJ Cliente',
  'Vendedor',
  'Estagio',
  'Tipo',
  'Ramo',
  'Premio (R$)',
  'Comissao (%)',
  'Seguradora',
  'Criado em',
]

@injectable()
export class ExportProposalsCsv {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(filters: ProposalFilters): Promise<string> {
    const { items } = await this.proposalRepo.findMany(filters, {
      limit: MAX_EXPORT_ROWS,
    })

    const header = PROPOSAL_CSV_COLUMNS.join(',') + '\n'
    const rows = items
      .map((p) =>
        formatCsvRow([
          p.id,
          p.clientName ?? p.clientId,
          p.clientDocument ?? '',
          p.salespersonName ?? p.salespersonId,
          p.stage,
          p.boardType,
          p.branch,
          (p.premiumValueInCents / 100).toFixed(2),
          (p.commissionPercentageInCents / 100).toFixed(2),
          p.insurerName ?? '',
          p.createdAt.toISOString(),
        ])
      )
      .join('\n')

    return header + rows
  }
}
