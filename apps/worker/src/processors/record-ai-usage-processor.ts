import {
  PrismaAiUsageRepository,
  RecordAiUsage,
  type CreateAiUsageRecordInput,
} from '@repo/core'
import { prismaAdmin } from '@repo/db'
import type { ConnectionOptions, Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'record-ai-usage-processor' })

export const QUEUE_NAME = 'erp-record-ai-usage'

export interface RecordAiUsageJobData
  extends Omit<CreateAiUsageRecordInput, 'messageIdHash'> {
  readonly messageIdHash?: string | null
}

export interface RecordAiUsageJobDeps {
  recordAiUsage: Pick<RecordAiUsage, 'execute'>
  existsByMessageIdHash: (
    organizationId: string,
    messageIdHash: string
  ) => Promise<boolean>
}

export async function processRecordAiUsageJob(
  data: RecordAiUsageJobData,
  deps: RecordAiUsageJobDeps
): Promise<void> {
  const messageIdHash = data.messageIdHash
  if (typeof messageIdHash === 'string' && messageIdHash.length > 0) {
    const exists = await deps.existsByMessageIdHash(
      data.organizationId,
      messageIdHash
    )
    if (exists) {
      return
    }
  }
  const { messageIdHash: hash, ...rest } = data
  await deps.recordAiUsage.execute({
    ...rest,
    ...(typeof hash === 'string' ? { messageIdHash: hash } : {}),
  })
}

export function setupRecordAiUsageProcessor(connection: ConnectionOptions) {
  const queue = new Queue<RecordAiUsageJobData>(QUEUE_NAME, { connection })
  const repository = new PrismaAiUsageRepository(prismaAdmin)
  const recordAiUsage = new RecordAiUsage(repository)
  const worker = new Worker<RecordAiUsageJobData>(
    QUEUE_NAME,
    async (job: Job<RecordAiUsageJobData>) => {
      await processRecordAiUsageJob(job.data, {
        recordAiUsage,
        existsByMessageIdHash: (organizationId, messageIdHash) =>
          repository.existsByMessageIdHash(organizationId, messageIdHash),
      })
    },
    {
      connection,
      concurrency: 5,
      maxStalledCount: 2,
      stalledInterval: 5_000,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86_400 },
    }
  )
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Record AI usage job failed')
  })
  return { worker, queue }
}
