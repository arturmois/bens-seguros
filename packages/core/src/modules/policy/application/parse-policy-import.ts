import { injectable, inject } from 'tsyringe'
import { parse } from 'papaparse'
import { randomUUID } from 'node:crypto'
import type { PolicyRepository } from '../domain/policy-repository.js'
import { policyImportRowSchema } from './policy-import-schema.js'
import {
  CsvImportError,
  MAX_IMPORT_ROWS,
  MAX_IMPORT_ERRORS,
} from '../../../shared/csv-import-types.js'
import type {
  CsvImportParseResult,
  CsvRowError,
} from '../../../shared/csv-import-types.js'

@injectable()
export class ParsePolicyImport {
  constructor(
    @inject('PolicyRepository')
    private readonly policyRepo: PolicyRepository
  ) {}

  async execute(
    csvContent: string,
    _organizationId: string
  ): Promise<CsvImportParseResult> {
    const parsed = parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.data.length === 0) {
      throw new CsvImportError(
        'NO_VALID_ROWS',
        'Nenhuma linha encontrada no CSV'
      )
    }

    if (parsed.data.length > MAX_IMPORT_ROWS) {
      throw new CsvImportError(
        'TOO_MANY_ROWS',
        `Maximo de ${String(MAX_IMPORT_ROWS)} linhas permitido`
      )
    }

    const errors: CsvRowError[] = []
    const validRows: Record<string, unknown>[] = []

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i]
      if (!row) continue

      const result = policyImportRowSchema.safeParse(row)
      if (!result.success) {
        if (errors.length < MAX_IMPORT_ERRORS) {
          for (const issue of result.error.issues) {
            errors.push({
              row: i + 2,
              field: issue.path.join('.'),
              message: issue.message,
              value: String(row[issue.path[0] as string] ?? ''),
            })
          }
        }
      } else {
        validRows.push(result.data)
      }
    }

    const total = parsed.data.length
    const invalid = total - validRows.length

    if (invalid > total * 0.5) {
      throw new CsvImportError(
        'TOO_MANY_ERRORS',
        `Mais de 50% das linhas sao invalidas (${String(invalid)}/${String(total)})`
      )
    }

    if (validRows.length === 0) {
      throw new CsvImportError(
        'NO_VALID_ROWS',
        'Nenhuma linha valida encontrada'
      )
    }

    const jobId = randomUUID()
    const preview = parsed.data.slice(0, 5)

    return {
      jobId,
      preview,
      validationSummary: {
        total,
        valid: validRows.length,
        invalid,
        errors,
      },
      validRows,
    }
  }
}
