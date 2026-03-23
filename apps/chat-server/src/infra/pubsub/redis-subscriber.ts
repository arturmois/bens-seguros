import { CHAT_PUBSUB_CHANNELS, SOCKET_EVENTS, isRecord } from '@repo/shared'
import type IORedis from 'ioredis'
import type { Server } from 'socket.io'
import type { AppLogger } from '../logger.js'

export class RedisSubscriber {
  constructor(
    private readonly redis: IORedis,
    private readonly io: Server,
    private readonly logger: AppLogger
  ) {}

  async subscribe(): Promise<void> {
    const channels = Object.values(CHAT_PUBSUB_CHANNELS)

    await this.redis.subscribe(...channels)
    this.logger.info({ channels }, 'Subscribed to Redis pub/sub channels')

    this.redis.on('message', (channel: string, rawMessage: string) => {
      this.handleMessage(channel, rawMessage)
    })
  }

  private handleMessage(channel: string, rawMessage: string): void {
    let payload: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(rawMessage)
      if (!isRecord(parsed)) {
        this.logger.warn({ channel }, 'Invalid pub/sub message format')
        return
      }
      payload = parsed
    } catch {
      this.logger.warn({ channel }, 'Failed to parse pub/sub message')
      return
    }

    const tenantId =
      typeof payload['tenantId'] === 'string' ? payload['tenantId'] : null

    if (!tenantId) {
      this.logger.warn({ channel }, 'Pub/sub message missing tenantId')
      return
    }

    this.routeMessage(channel, tenantId, payload)
  }

  private routeMessage(
    channel: string,
    tenantId: string,
    payload: Record<string, unknown>
  ): void {
    const lobbyRoom = `tenant:${tenantId}:lobby`

    switch (channel) {
      case CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE: {
        const convId =
          typeof payload['conversationId'] === 'string'
            ? payload['conversationId']
            : null
        const conversationRoom = convId
          ? `tenant:${tenantId}:conversation:${convId}`
          : null

        if (conversationRoom) {
          this.io
            .to(conversationRoom)
            .emit(SOCKET_EVENTS.INCOMING_MESSAGE, payload)
          this.io
            .to(lobbyRoom)
            .except(conversationRoom)
            .emit(SOCKET_EVENTS.INCOMING_MESSAGE, payload)
        } else {
          this.io.to(lobbyRoom).emit(SOCKET_EVENTS.INCOMING_MESSAGE, payload)
        }
        break
      }

      case CHAT_PUBSUB_CHANNELS.MESSAGE_STATUS: {
        const convId =
          typeof payload['conversationId'] === 'string'
            ? payload['conversationId']
            : null
        if (convId) {
          this.io
            .to(`tenant:${tenantId}:conversation:${convId}`)
            .emit(SOCKET_EVENTS.MESSAGE_STATUS, payload)
        }
        break
      }

      case CHAT_PUBSUB_CHANNELS.CHANNEL_STATUS: {
        this.io.to(lobbyRoom).emit(SOCKET_EVENTS.CHANNEL_STATUS, payload)
        break
      }

      case CHAT_PUBSUB_CHANNELS.PAIRING_CODE_RESULT: {
        this.io.to(lobbyRoom).emit(SOCKET_EVENTS.PAIRING_CODE_RESULT, payload)
        break
      }

      case CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE: {
        this.io.to(lobbyRoom).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, payload)
        break
      }

      case CHAT_PUBSUB_CHANNELS.UNREAD_UPDATE: {
        const userId =
          typeof payload['userId'] === 'string' ? payload['userId'] : null
        if (userId) {
          this.io
            .to(`tenant:${tenantId}:user:${userId}`)
            .emit(SOCKET_EVENTS.UNREAD_UPDATE, payload)
        }
        this.io.to(lobbyRoom).emit(SOCKET_EVENTS.UNREAD_UPDATE, payload)
        break
      }

      default:
        this.logger.warn({ channel }, 'Unknown pub/sub channel')
    }
  }
}
