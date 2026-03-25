export interface ImportPreviewRow {
  readonly row: number
  readonly data: Record<string, string>
  readonly errors: ReadonlyArray<{ field: string; message: string }>
}

export interface ImportPreviewResponse {
  readonly jobId: string
  readonly totalRows: number
  readonly validRows: number
  readonly errorRows: number
  readonly preview: ReadonlyArray<ImportPreviewRow>
  readonly errors: ReadonlyArray<{ row: number; message: string }>
}

export interface ImportStatusResponse {
  readonly status: 'processing' | 'completed' | 'failed'
  readonly progress: {
    readonly processed: number
    readonly created: number
    readonly skipped: number
    readonly failed: number
    readonly total: number
    readonly errors: ReadonlyArray<{ row: number; message: string }>
  }
}
