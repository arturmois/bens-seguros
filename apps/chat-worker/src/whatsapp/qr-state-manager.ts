import type IORedis from 'ioredis'
import { Channel } from '@repo/db-chat'
import { CHAT_PUBSUB_CHANNELS, WHATSAPP_STATE_KEYS } from '@repo/shared'

const QR_TTL_SECONDS = 60

export class QrStateManager {
  constructor(private readonly redis: IORedis) {}

  async emitQr(channelId: string, tenantId: string, qr: string): Promise<void> {
    await Promise.all([
      this.redis.set(WHATSAPP_STATE_KEYS.state(channelId), 'qr_pending'),
      this.redis.set(
        WHATSAPP_STATE_KEYS.lastQr(channelId),
        qr,
        'EX',
        QR_TTL_SECONDS
      ),
      Channel.updateOne(
        { _id: channelId, tenantId },
        { $set: { status: 'QR_PENDING' } }
      ),
      this.redis.publish(
        CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS,
        JSON.stringify({ channelId, tenantId, status: 'QR_PENDING', qr })
      ),
    ])
  }

  async emitConnected(channelId: string, tenantId: string): Promise<void> {
    await Promise.all([
      this.redis.set(WHATSAPP_STATE_KEYS.state(channelId), 'connected'),
      this.redis.del(WHATSAPP_STATE_KEYS.lastQr(channelId)),
      Channel.updateOne(
        { _id: channelId, tenantId },
        { $set: { status: 'CONNECTED', lastConnectedAt: new Date() } }
      ),
      this.redis.publish(
        CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS,
        JSON.stringify({ channelId, tenantId, status: 'CONNECTED' })
      ),
    ])
  }

  async emitDisconnected(channelId: string, tenantId: string): Promise<void> {
    await Promise.all([
      this.redis.set(WHATSAPP_STATE_KEYS.state(channelId), 'disconnected'),
      this.redis.del(WHATSAPP_STATE_KEYS.lastQr(channelId)),
      Channel.updateOne(
        { _id: channelId, tenantId },
        { $set: { status: 'DISCONNECTED' } }
      ),
      this.redis.publish(
        CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS,
        JSON.stringify({ channelId, tenantId, status: 'DISCONNECTED' })
      ),
    ])
  }

  async clearState(channelId: string): Promise<void> {
    await Promise.all([
      this.redis.del(WHATSAPP_STATE_KEYS.state(channelId)),
      this.redis.del(WHATSAPP_STATE_KEYS.lastQr(channelId)),
    ])
  }
}
