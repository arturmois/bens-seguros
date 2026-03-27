import { type Job } from 'bullmq'
import pino from 'pino'
import { Message } from '@repo/db-chat'
import { env } from '@repo/env'

const logger = pino({ name: 'media-migration-processor' })

const BATCH_SIZE = 100
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1_000

export async function processMediaMigration(_job: Job): Promise<void> {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY
  ) {
    logger.warn('R2 credentials not configured, skipping media migration')
    return
  }

  const r2Endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  const r2Bucket = env.R2_BUCKET_NAME

  const cutoff = new Date(Date.now() - NINETY_DAYS_MS)

  const messages = await Message.find({
    mediaUrl: { $exists: true, $ne: null },
    mediaKey: { $exists: false },
    createdAt: { $lt: cutoff },
  })
    .select('_id mediaUrl tenantId conversationId')
    .limit(BATCH_SIZE)
    .lean()
    .exec()

  if (messages.length === 0) {
    logger.info('No media to migrate')
    return
  }

  let migrated = 0
  let failed = 0

  for (const msg of messages) {
    try {
      const mediaUrl = msg.mediaUrl as string | undefined
      if (!mediaUrl) {
        failed++
        continue
      }
      const response = await fetch(mediaUrl)
      if (!response.ok) {
        logger.warn(
          { messageId: String(msg._id), status: response.status },
          'Failed to download media'
        )
        failed++
        continue
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType =
        response.headers.get('content-type') ?? 'application/octet-stream'
      const ext = contentType.split('/').at(1) ?? 'bin'
      const storageKey = `chat-media/${msg.tenantId}/${String(msg._id)}.${ext}`

      const uploadUrl = `${r2Endpoint}/${r2Bucket}/${storageKey}`
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: buffer,
        headers: { 'Content-Type': contentType },
      })

      if (!uploadRes.ok) {
        logger.warn({ messageId: String(msg._id) }, 'Failed to upload to R2')
        failed++
        continue
      }

      await Message.updateOne(
        { _id: msg._id },
        { $set: { mediaKey: storageKey }, $unset: { mediaUrl: 1 } }
      ).exec()

      migrated++
    } catch (err: unknown) {
      logger.error(
        { err, messageId: String(msg._id) },
        'Media migration failed for message'
      )
      failed++
    }
  }

  logger.info(
    { migrated, failed, total: messages.length },
    'Media migration batch completed'
  )
}
