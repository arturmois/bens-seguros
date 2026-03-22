import type { CreateNotificationInput } from '@repo/core'
import { Queue } from 'bullmq'
import pino from 'pino'

const logger = pino({ name: 'notification-enqueuer' })

export interface NotificationJobData {
  readonly notification: CreateNotificationInput
  readonly email?: {
    readonly to: string
    readonly subject: string
    readonly html: string
  }
}

let notificationQueue: Queue<NotificationJobData> | null = null

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

function getQueue(): Queue<NotificationJobData> {
  if (!notificationQueue) {
    const redisInfo = parseRedisUrl(
      process.env.REDIS_URL ?? 'redis://localhost:6379'
    )
    notificationQueue = new Queue<NotificationJobData>('erp-notifications', {
      connection: {
        host: redisInfo.host,
        port: redisInfo.port,
        ...(redisInfo.password ? { password: redisInfo.password } : {}),
      },
    })
  }
  return notificationQueue
}

export async function enqueueNotification(
  data: NotificationJobData
): Promise<void> {
  try {
    await getQueue().add('notification', data)
  } catch (err: unknown) {
    logger.error(
      { err, type: data.notification.type },
      'Failed to enqueue notification'
    )
  }
}

export async function enqueueNotifications(
  items: NotificationJobData[]
): Promise<void> {
  const queue = getQueue()
  try {
    await queue.addBulk(items.map((data) => ({ name: 'notification', data })))
  } catch (err: unknown) {
    logger.error(
      { err, count: items.length },
      'Failed to enqueue notifications'
    )
  }
}
