import { injectable, inject } from 'tsyringe'
import type {
  ProposalRepository,
  ProposalFilters,
} from '../domain/proposal-repository.js'
import { CSV_BOM, formatCsvRow } from '../../../shared/csv-utils.js'

const BATCH_SIZE = 500

const PROPOSAL_CSV_COLUMNS = [
  'ID',
  'Cliente',
  'CPF/CNPJ Cliente',
  'Vendedor',
  'Estagio',
  'Tipo',
  'Ramo',
  'Premio (R$)',
  'Comissão (%)',
  'Seguradora',
  'Criado em',
]

@injectable()
export class ExportProposalsCsv {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async *generateCsvRows(filters: ProposalFilters): AsyncGenerator<string> {
    yield CSV_BOM + PROPOSAL_CSV_COLUMNS.join(',') + '\n'
    let cursor: string | undefined
    let hasMore = true
    while (hasMore) {
      const result = await this.proposalRepo.listForView(filters, {
        limit: BATCH_SIZE,
        cursor,
      })
      for (const p of result.items) {
        yield formatCsvRow([
          p.id,
          p.clientName ?? p.contactId,
          p.clientDocument ?? '',
          p.salespersonName ?? p.salespersonId,
          p.stage,
          p.boardType,
          p.branch,
          (p.premiumValueInCents / 100).toFixed(2),
          (p.commissionPercentageInCents / 100).toFixed(2),
          p.insurerName ?? '',
          p.createdAt.toISOString(),
        ]) + '\n'
      }
      hasMore = result.items.length === BATCH_SIZE
      cursor = result.items.at(-1)?.id
    }
  }
}
