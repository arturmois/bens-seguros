import { injectable, inject } from 'tsyringe'
import type {
  ClientRepository,
  ClientFilters,
} from '../domain/client-repository.js'
import {
  MAX_EXPORT_ROWS,
  CSV_BOM,
  formatCsvRow,
} from '../../../shared/csv-utils.js'

const CLIENT_CSV_COLUMNS = [
  'ID',
  'Nome',
  'CPF/CNPJ',
  'Tipo',
  'Email',
  'Telefone',
  'Data Nascimento',
  'Profissao',
  'Estado Civil',
  'Tags',
  'Consentimento LGPD',
  'Criado em',
]

@injectable()
export class ExportClientsCsv {
  constructor(
    @inject('ClientRepository')
    private readonly clientRepo: ClientRepository
  ) {}

  async execute(filters: ClientFilters): Promise<string> {
    const { items } = await this.clientRepo.findMany(filters, {
      limit: MAX_EXPORT_ROWS,
    })

    const header = CLIENT_CSV_COLUMNS.join(',') + '\n'
    const rows = items
      .map((c) =>
        formatCsvRow([
          c.id,
          c.name,
          c.document,
          c.type,
          c.email ?? '',
          c.phone ?? '',
          c.birthDate ? (c.birthDate.toISOString().split('T')[0] ?? '') : '',
          c.profession ?? '',
          c.maritalStatus ?? '',
          c.tags.join(';'),
          c.consentLgpd ? 'Sim' : 'Nao',
          c.createdAt.toISOString(),
        ])
      )
      .join('\n')

    return CSV_BOM + header + rows
  }
}
