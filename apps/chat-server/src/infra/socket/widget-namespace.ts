import { env } from '@repo/env'
import type IORedis from 'ioredis'
import jwt from 'jsonwebtoken'
import type { Namespace, Server, Socket } from 'socket.io'

import type { AppLogger } from '../logger.js'
import {
  getVisitorData,
  registerWidgetMessageEvents,
  registerWidgetTypingEvents,
  visitorTokenSchema,
} from './widget-message-handler.js'
import { subscribeWidgetRedis } from './widget-redis-subscriber.js'

interface SetupWidgetNamespaceOptions {
  readonly io: Server
  readonly logger: AppLogger
  readonly redisSub: IORedis
  readonly redisPub: IORedis
}

export function setupWidgetNamespace(
  options: SetupWidgetNamespaceOptions
): void {
  const { io, logger, redisSub, redisPub } = options
  const widgetNs: Namespace = io.of('/widget')
  widgetNs.use((socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth['token']
    if (typeof token !== 'string') {
      logger.warn('Widget socket rejected: missing token')
      next(new Error('Token de autenticação ausente'))
      return
    }
    try {
      const decoded: unknown = jwt.verify(token, env.SOCKET_JWT_SECRET)
      const parsed = visitorTokenSchema.safeParse(decoded)
      if (!parsed.success) {
        logger.warn('Widget socket rejected: invalid token payload')
        next(new Error('Token inválido'))
        return
      }
      socket.data['visitor'] = parsed.data
      next()
    } catch {
      logger.warn('Widget socket rejected: token verification failed')
      next(new Error('Token expirado ou inválido'))
    }
  })
  widgetNs.on('connection', (socket: Socket) => {
    const visitor = getVisitorData(socket)
    const widgetRoom = `widget:${visitor.conversationId}`
    void socket.join(widgetRoom)
    logger.info(
      {
        conversationId: visitor.conversationId,
        contactId: visitor.contactId,
      },
      'Widget visitor connected'
    )
    registerWidgetMessageEvents(socket, visitor, logger, redisPub)
    registerWidgetTypingEvents(socket, visitor, io, logger)
    socket.on('disconnect', () => {
      logger.info(
        { conversationId: visitor.conversationId },
        'Widget visitor disconnected'
      )
    })
  })
  subscribeWidgetRedis(widgetNs, redisSub, logger)
}
