export interface CsvRowError {
  readonly row: number
  readonly field: string
  readonly message: string
  readonly value?: string
}

export interface CsvValidationSummary {
  readonly total: number
  readonly valid: number
  readonly invalid: number
  readonly errors: readonly CsvRowError[]
}

export interface CsvImportParseResult {
  readonly jobId: string
  readonly preview: ReadonlyArray<Record<string, string>>
  readonly validationSummary: CsvValidationSummary
  readonly validRows: ReadonlyArray<Record<string, unknown>>
}

export interface CsvImportJobData {
  readonly entityType: 'client' | 'policy'
  readonly organizationId: string
  readonly userId: string
  readonly rows: ReadonlyArray<Record<string, unknown>>
  readonly totalRows: number
}

export interface CsvImportProgress {
  processed: number
  created: number
  skipped: number
  failed: number
  total: number
  errors: Array<{ row: number; message: string }>
}

export class CsvImportError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'CsvImportError'
  }
}

export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
export const MAX_IMPORT_ROWS = 50_000
export const IMPORT_BATCH_SIZE = 50
export const MAX_IMPORT_ERRORS = 100
