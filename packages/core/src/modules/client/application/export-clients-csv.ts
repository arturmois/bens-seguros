import { injectable, inject } from 'tsyringe'
import { maskDocument } from '@repo/shared'
import type {
  ClientRepository,
  ClientFilters,
} from '../domain/client-repository.js'
import { CSV_BOM, formatCsvRow } from '../../../shared/csv-utils.js'

const BATCH_SIZE = 500

const CLIENT_CSV_COLUMNS = [
  'ID',
  'Razão Social',
  'CPF/CNPJ',
  'Tipo Pessoa',
  'Profissão',
  'Estado Civil',
  'Data Nascimento Fiscal',
  'Criado em',
]

@injectable()
export class ExportClientsCsv {
  constructor(
    @inject('ClientRepository')
    private readonly clientRepo: ClientRepository
  ) {}

  async *generateCsvRows(filters: ClientFilters): AsyncGenerator<string> {
    yield CSV_BOM + CLIENT_CSV_COLUMNS.join(',') + '\n'

    let cursor: string | undefined
    let hasMore = true

    while (hasMore) {
      const result = await this.clientRepo.findMany(filters, {
        limit: BATCH_SIZE,
        cursor,
      })

      for (const c of result.items) {
        yield formatCsvRow([
          c.id,
          c.legalName,
          maskDocument(c.document),
          c.personType,
          c.profession ?? '',
          c.maritalStatus ?? '',
          c.fiscalBirthDate
            ? (c.fiscalBirthDate.toISOString().split('T')[0] ?? '')
            : '',
          c.createdAt.toISOString(),
        ]) + '\n'
      }

      hasMore = result.items.length === BATCH_SIZE
      cursor = result.items.at(-1)?.id
    }
  }
}
