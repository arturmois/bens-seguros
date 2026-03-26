export { container, inject, injectable, singleton } from './container.js'

// Shared utilities
export { RedisCacheService } from './shared/cache-service.js'
export type { CacheService } from './shared/cache-service.js'

export {
  CSV_BOM,
  escapeCsvField,
  formatCsvRow,
  MAX_EXPORT_ROWS,
} from './shared/csv-utils.js'

export type {
  CsvRowError,
  CsvValidationSummary,
  CsvImportParseResult,
  CsvImportJobData,
  CsvImportProgress,
} from './shared/csv-import-types.js'
export {
  CsvImportError,
  MAX_IMPORT_FILE_SIZE,
  MAX_IMPORT_ROWS,
  IMPORT_BATCH_SIZE,
  MAX_IMPORT_ERRORS,
} from './shared/csv-import-types.js'

// Domain modules
export * from './modules/assistance/index.js'
export {
  logApprove,
  logAudit,
  logCreate,
  logDelete,
  logReject,
  logUpdate,
} from './modules/audit/log-audit.js'
export * from './modules/claim/index.js'
export * from './modules/client/index.js'
export * from './modules/commission/index.js'
export * from './modules/document/index.js'
export * from './modules/endorsement/index.js'
export * from './modules/insurer/index.js'
export * from './modules/notification/index.js'
export * from './modules/occurrence/index.js'
export * from './modules/policy/index.js'
export * from './modules/proposal/index.js'
