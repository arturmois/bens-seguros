import { UnrecoverableError, type Job } from 'bullmq'
import pino from 'pino'
import { Channel } from '@repo/db-chat'
import type * as BaileysManager from '../messaging/baileys-manager.js'
import type { BrokerEvents } from '../messaging/broker.js'
import type { QrStateManager } from '../whatsapp/qr-state-manager.js'

const logger = pino({ name: 'connect-channel-processor' })

export interface ConnectChannelJobData {
  readonly channelId: string
  readonly tenantId: string
}

function buildConnectionEvents(
  qrStateManager: QrStateManager,
  channelId: string,
  tenantId: string,
  baseEventsFactory: () => BrokerEvents
): BrokerEvents {
  const baseEvents = baseEventsFactory()
  return {
    onMessage: baseEvents.onMessage,
    onStatusUpdate: baseEvents.onStatusUpdate,
    onConnectionUpdate: (status: string, qr?: string) => {
      if (status === 'QR_PENDING' && qr) {
        qrStateManager.emitQr(channelId, tenantId, qr).catch((err: unknown) => {
          logger.error({ err, channelId }, 'Failed to persist QR state')
        })
        return
      }
      if (status === 'CONNECTED') {
        qrStateManager
          .emitConnected(channelId, tenantId)
          .catch((err: unknown) => {
            logger.error(
              { err, channelId },
              'Failed to persist connected state'
            )
          })
        return
      }
      qrStateManager
        .emitDisconnected(channelId, tenantId)
        .catch((err: unknown) => {
          logger.error(
            { err, channelId },
            'Failed to persist disconnected state'
          )
        })
    },
  }
}

export function createConnectChannelProcessor(
  manager: typeof BaileysManager,
  qrStateManager: QrStateManager,
  buildEvents: (channelId: string, tenantId: string) => BrokerEvents
) {
  return async function processConnectChannel(
    job: Job<ConnectChannelJobData>
  ): Promise<void> {
    const { channelId, tenantId } = job.data
    logger.info({ channelId, tenantId }, 'Processing connect-channel job')
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
    const events = buildConnectionEvents(
      qrStateManager,
      channelId,
      tenantId,
      () => buildEvents(channelId, tenantId)
    )
    await manager.connectChannel(channelId, tenantId, events)
    logger.info({ channelId, tenantId }, 'Channel connection initiated')
  }
}
