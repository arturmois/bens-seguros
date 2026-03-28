import { CHAT_PUBSUB_CHANNELS, SOCKET_EVENTS, isRecord } from '@repo/shared'
import type IORedis from 'ioredis'
import type { Namespace } from 'socket.io'

import type { AppLogger } from '../logger.js'

export function subscribeWidgetRedis(
  widgetNs: Namespace,
  redisSub: IORedis,
  logger: AppLogger
): void {
  const channels = [
    CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE,
    CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE,
  ]

  redisSub
    .subscribe(...channels)
    .then(() => {
      logger.info(
        { channels },
        'Widget namespace subscribed to Redis pub/sub channels'
      )
    })
    .catch((err: unknown) => {
      logger.error(
        { err },
        'Widget namespace failed to subscribe to Redis pub/sub'
      )
    })

  redisSub.on('message', (channel: string, rawMessage: string) => {
    handleWidgetRedisMessage(widgetNs, channel, rawMessage, logger)
  })
}

function handleWidgetRedisMessage(
  widgetNs: Namespace,
  channel: string,
  rawMessage: string,
  logger: AppLogger
): void {
  let payload: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(rawMessage)
    if (!isRecord(parsed)) {
      logger.warn({ channel }, 'Widget: invalid pub/sub message format')
      return
    }
    payload = parsed
  } catch {
    logger.warn({ channel }, 'Widget: failed to parse pub/sub message')
    return
  }

  const conversationId =
    typeof payload['conversationId'] === 'string'
      ? payload['conversationId']
      : null

  if (!conversationId) return

  const widgetRoom = `widget:${conversationId}`

  switch (channel) {
    case CHAT_PUBSUB_CHANNELS.INCOMING_MESSAGE: {
      // Only forward messages NOT from CLIENT (bot/agent responses)
      const senderType =
        typeof payload['senderType'] === 'string' ? payload['senderType'] : null

      if (senderType === 'CLIENT') return

      widgetNs
        .to(widgetRoom)
        .emit(SOCKET_EVENTS.WIDGET_INCOMING_MESSAGE, payload)
      break
    }

    case CHAT_PUBSUB_CHANNELS.CONVERSATION_UPDATE: {
      widgetNs
        .to(widgetRoom)
        .emit(SOCKET_EVENTS.WIDGET_CONVERSATION_UPDATED, payload)
      break
    }

    default:
      break
  }
}
