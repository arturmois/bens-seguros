export interface CsvRowError {
  readonly row: number
  readonly field: string
  readonly message: string
  readonly value?: string
}

export interface ImportPreviewResponse {
  readonly jobId: string
  readonly preview: ReadonlyArray<Record<string, string>>
  readonly validationSummary: {
    readonly total: number
    readonly valid: number
    readonly invalid: number
    readonly errors: ReadonlyArray<CsvRowError>
  }
}

export interface ImportStatusResponse {
  readonly status: 'active' | 'waiting' | 'completed' | 'failed'
  readonly progress: {
    readonly processed: number
    readonly created: number
    readonly skipped: number
    readonly failed: number
    readonly total: number
    readonly errors: ReadonlyArray<{ row: number; message: string }>
  }
}
