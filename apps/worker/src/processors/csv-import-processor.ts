import type { ConnectionOptions, Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'
import type { CsvImportJobData, CsvImportProgress } from '@repo/core'
import {
  IMPORT_BATCH_SIZE,
  MAX_IMPORT_ERRORS,
  type ImportClientRow,
  type ImportPolicyRow,
} from '@repo/core'

const logger = pino({ name: 'csv-import-processor' })
const QUEUE_NAME = 'csv-import'

export interface CsvImportDeps {
  importClientRow: Pick<ImportClientRow, 'execute'>
  importPolicyRow: Pick<ImportPolicyRow, 'execute'>
}

export async function runCsvImport(
  job: {
    data: CsvImportJobData
    updateProgress: (progress: CsvImportProgress) => Promise<void>
  },
  deps: CsvImportDeps
): Promise<CsvImportProgress> {
  const { entityType, organizationId, userId, rows, totalRows } = job.data
  const progress: CsvImportProgress = {
    processed: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    total: totalRows,
    errors: [],
  }
  for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
    const batch = rows.slice(i, i + IMPORT_BATCH_SIZE)
    for (let index = 0; index < batch.length; index++) {
      const raw = batch[index]
      if (!raw) continue
      const result =
        entityType === 'client'
          ? await deps.importClientRow.execute({
              organizationId,
              userId,
              raw,
            })
          : await deps.importPolicyRow.execute({
              organizationId,
              userId,
              raw,
            })
      if (result.status === 'created') {
        progress.created += 1
      } else if (result.status === 'skipped') {
        progress.skipped += 1
      } else {
        progress.failed += 1
        if (progress.errors.length < MAX_IMPORT_ERRORS) {
          progress.errors.push({
            row: i + index + 2,
            message: result.message,
          })
        }
      }
    }
    progress.processed += batch.length
    await job.updateProgress(progress)
  }
  return progress
}

export function setupCsvImportProcessor(
  connection: ConnectionOptions,
  deps: CsvImportDeps
) {
  const queue = new Queue<CsvImportJobData>(QUEUE_NAME, { connection })
  const worker = new Worker<CsvImportJobData>(
    QUEUE_NAME,
    async (job: Job<CsvImportJobData>) => runCsvImport(job, deps),
    {
      connection,
      concurrency: 2,
      removeOnComplete: { age: 7200 },
      removeOnFail: { age: 86_400 },
    }
  )
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'CSV import job failed')
  })
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'CSV import job completed')
  })
  return { queue, worker }
}
