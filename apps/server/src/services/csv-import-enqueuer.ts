import type { CsvImportJobData } from '@repo/core'
import { env } from '@repo/env'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'

const logger = pino({ name: 'csv-import-enqueuer' })

const QUEUE_NAME = 'csv-import'
const REDIS_PREFIX = 'csv-import:'
const STAGING_TTL_SECONDS = 1800

function parseRedisUrl(url: string): {
  host: string
  port: number
  password?: string
} {
  const parsed = new URL(url)
  return {
    host: parsed.hostname || 'localhost',
    port: Number(parsed.port) || 6379,
    ...(parsed.password
      ? { password: decodeURIComponent(parsed.password) }
      : {}),
  }
}

let csvImportQueue: Queue<CsvImportJobData> | null = null
let redisClient: IORedis | null = null

function getRedis(): IORedis {
  if (!redisClient) {
    redisClient = new IORedis(env.REDIS_URL)
  }
  return redisClient
}

function getQueue(): Queue<CsvImportJobData> {
  if (!csvImportQueue) {
    const redisInfo = parseRedisUrl(env.REDIS_URL)
    csvImportQueue = new Queue<CsvImportJobData>(QUEUE_NAME, {
      connection: {
        host: redisInfo.host,
        port: redisInfo.port,
        ...(redisInfo.password ? { password: redisInfo.password } : {}),
      },
    })
  }
  return csvImportQueue
}

export async function stageImportData(
  jobId: string,
  organizationId: string,
  rows: ReadonlyArray<Record<string, unknown>>
): Promise<void> {
  const redis = getRedis()
  await redis.set(
    `${REDIS_PREFIX}${jobId}`,
    JSON.stringify({ organizationId, rows }),
    'EX',
    STAGING_TTL_SECONDS
  )
}

interface StagedImportData {
  readonly organizationId: string
  readonly rows: ReadonlyArray<Record<string, unknown>>
}

export async function retrieveStagedData(
  jobId: string,
  organizationId: string
): Promise<ReadonlyArray<Record<string, unknown>> | null> {
  const redis = getRedis()
  const data = await redis.get(`${REDIS_PREFIX}${jobId}`)
  if (!data) return null
  const staged: unknown = JSON.parse(data)
  if (
    typeof staged !== 'object' ||
    staged === null ||
    !('organizationId' in staged) ||
    !('rows' in staged)
  ) {
    logger.warn({ jobId }, 'Staged data missing organizationId structure')
    return null
  }
  const typedStaged = staged as StagedImportData
  if (typedStaged.organizationId !== organizationId) {
    logger.warn(
      { jobId, expected: organizationId, actual: typedStaged.organizationId },
      'Cross-tenant import data access attempt blocked'
    )
    return null
  }
  return typedStaged.rows
}

export async function removeStagedData(jobId: string): Promise<void> {
  const redis = getRedis()
  await redis.del(`${REDIS_PREFIX}${jobId}`)
}

export async function enqueueImportJob(
  jobId: string,
  data: CsvImportJobData
): Promise<void> {
  try {
    await getQueue().add('csv-import', data, {
      jobId,
      attempts: 1,
      removeOnComplete: { age: 7200 },
      removeOnFail: { age: 86_400 },
    })
  } catch (err: unknown) {
    logger.error({ err, jobId }, 'Failed to enqueue CSV import job')
    throw err
  }
}

export async function getImportJobStatus(jobId: string): Promise<{
  status: 'active' | 'completed' | 'failed' | 'waiting' | 'not_found'
  organizationId: string | null
  progress: Record<string, unknown> | null
  result: Record<string, unknown> | null
}> {
  const queue = getQueue()
  const job = await queue.getJob(jobId)
  if (!job) {
    return {
      status: 'not_found',
      organizationId: null,
      progress: null,
      result: null,
    }
  }
  const state = await job.getState()
  const progress = job.progress as Record<string, unknown> | undefined
  const result = job.returnvalue as Record<string, unknown> | undefined
  return {
    status:
      state === 'unknown'
        ? 'not_found'
        : (state as 'active' | 'completed' | 'failed' | 'waiting'),
    organizationId: job.data.organizationId,
    progress: progress ?? null,
    result: result ?? null,
  }
}
