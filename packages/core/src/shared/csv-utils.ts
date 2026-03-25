export const MAX_EXPORT_ROWS = 10_000

/** UTF-8 BOM prefix so Brazilian Excel opens accented characters correctly */
export const CSV_BOM = '\uFEFF'

export function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function formatCsvRow(fields: string[]): string {
  return fields.map((f) => escapeCsvField(f)).join(',')
}
