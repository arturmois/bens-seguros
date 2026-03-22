/**
 * Manages WhatsApp connection state in Redis for each channel.
 *
 * Keys:
 *   whatsapp:state:{channelId}    — current state ('connected' | 'disconnected' | 'qr_pending')
 *   whatsapp:last_qr:{channelId}  — last raw QR string (TTL 60s, matches Baileys QR expiry)
 *
 * Pub/sub channels (existing):
 *   CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS — broadcasts status changes to chat-server
 */
import type IORedis from 'ioredis';
import { CHAT_PUBSUB_CHANNELS, WHATSAPP_STATE_KEYS } from '@repo/shared';

const QR_TTL_SECONDS = 60;

export class QrStateManager {
  constructor(private readonly redis: IORedis) {}

  async emitQr(channelId: string, tenantId: string, qr: string): Promise<void> {
    await Promise.all([
      this.redis.set(WHATSAPP_STATE_KEYS.state(channelId), 'qr_pending'),
      this.redis.set(WHATSAPP_STATE_KEYS.lastQr(channelId), qr, 'EX', QR_TTL_SECONDS),
      this.redis.publish(
        CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS,
        JSON.stringify({ channelId, tenantId, status: 'QR_PENDING', qr }),
      ),
    ]);
  }

  async emitConnected(channelId: string, tenantId: string): Promise<void> {
    await Promise.all([
      this.redis.set(WHATSAPP_STATE_KEYS.state(channelId), 'connected'),
      this.redis.del(WHATSAPP_STATE_KEYS.lastQr(channelId)),
      this.redis.publish(
        CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS,
        JSON.stringify({ channelId, tenantId, status: 'CONNECTED' }),
      ),
    ]);
  }

  async emitDisconnected(channelId: string, tenantId: string): Promise<void> {
    await Promise.all([
      this.redis.set(WHATSAPP_STATE_KEYS.state(channelId), 'disconnected'),
      this.redis.del(WHATSAPP_STATE_KEYS.lastQr(channelId)),
      this.redis.publish(
        CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS,
        JSON.stringify({ channelId, tenantId, status: 'DISCONNECTED' }),
      ),
    ]);
  }
}
