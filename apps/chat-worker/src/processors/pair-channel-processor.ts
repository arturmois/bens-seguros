import { UnrecoverableError, type Job } from 'bullmq'
import pino from 'pino'
import type IORedis from 'ioredis'
import { Channel } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS } from '@repo/shared'
import type * as BaileysManager from '../messaging/baileys-manager.js'
import type { BrokerEvents } from '../messaging/broker.js'
import type { QrStateManager } from '../whatsapp/qr-state-manager.js'

const logger = pino({ name: 'pair-channel-processor' })

export interface PairChannelJobData {
  readonly channelId: string
  readonly tenantId: string
  readonly phoneNumber: string
}

interface PairingCodeResult {
  readonly channelId: string
  readonly tenantId: string
  readonly success: boolean
  readonly code?: string
  readonly error?: string
}

export function createPairChannelProcessor(
  manager: typeof BaileysManager,
  _qrStateManager: QrStateManager,
  pubsubRedis: IORedis,
  buildEvents: (channelId: string, tenantId: string) => BrokerEvents
) {
  return async function processPairChannel(
    job: Job<PairChannelJobData>
  ): Promise<void> {
    const { channelId, tenantId, phoneNumber } = job.data

    logger.info(
      { channelId, tenantId, phoneNumber },
      'Processing pair-channel job'
    )

    const channel = await Channel.findOne({ _id: channelId, tenantId })
      .lean()
      .exec()

    if (!channel) {
      throw new UnrecoverableError(
        `Channel not found: channelId=${channelId} tenantId=${tenantId}`
      )
    }

    if (channel.brokerType !== 'BAILEYS') {
      throw new UnrecoverableError(
        `Channel ${channelId} is not a Baileys channel (type=${String(channel.brokerType)})`
      )
    }

    const events = buildEvents(channelId, tenantId)

    try {
      const code = await manager.connectChannelWithPairingCode(
        channelId,
        tenantId,
        phoneNumber,
        events
      )

      const result: PairingCodeResult = {
        channelId,
        tenantId,
        success: true,
        code,
      }

      await pubsubRedis.publish(
        CHAT_PUBSUB_CHANNELS.PAIRING_CODE_RESULT,
        JSON.stringify(result)
      )

      logger.info(
        { channelId, tenantId },
        'Pairing code generated successfully'
      )
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      const result: PairingCodeResult = {
        channelId,
        tenantId,
        success: false,
        error: errorMessage,
      }

      await pubsubRedis.publish(
        CHAT_PUBSUB_CHANNELS.PAIRING_CODE_RESULT,
        JSON.stringify(result)
      )

      logger.error(
        { channelId, tenantId, err },
        'Failed to generate pairing code'
      )
      throw err
    }
  }
}
