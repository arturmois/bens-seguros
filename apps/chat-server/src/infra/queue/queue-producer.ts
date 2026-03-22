import { CHAT_QUEUES } from '@repo/shared'
import { Queue } from 'bullmq'
import type { AppLogger } from '../logger.js'

const DEFAULT_RETRY_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
}

interface QueueConnectionOptions {
  readonly host: string
  readonly port: number
  readonly maxRetriesPerRequest: null
}

export class QueueProducer {
  private readonly queues: Map<string, Queue>

  constructor(
    connection: QueueConnectionOptions,
    private readonly logger: AppLogger
  ) {
    this.queues = new Map()

    for (const queueName of Object.values(CHAT_QUEUES)) {
      this.queues.set(queueName, new Queue(queueName, { connection }))
    }
  }

  async enqueue(
    queueName: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const queue = this.queues.get(queueName)

    if (!queue) {
      this.logger.error({ queueName }, 'Queue not found')
      throw new Error(`Queue ${queueName} not registered`)
    }

    await queue.add(queueName, data, {
      attempts: DEFAULT_RETRY_OPTIONS.attempts,
      backoff: DEFAULT_RETRY_OPTIONS.backoff,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86_400 },
    })

    this.logger.debug({ queueName }, 'Job enqueued')
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) =>
      queue.close()
    )
    await Promise.all(closePromises)
    this.queues.clear()
    this.logger.info('All queues closed')
  }
}
