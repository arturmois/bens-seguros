import {
  CHAT_LIMITS,
  SOCKET_EVENTS,
  WHATSAPP_STATE_KEYS,
  isRecord,
} from '@repo/shared'
import { Channel } from '@repo/db-chat'
import type IORedis from 'ioredis'
import type { Server, Socket } from 'socket.io'
import { container } from 'tsyringe'
import type { AppLogger } from '../logger.js'

import { AssignConversation } from '../../application/assign-conversation.js'
import { CloseConversation } from '../../application/close-conversation.js'
import { SendMessage } from '../../application/send-message.js'
import { TransferConversation } from '../../application/transfer-conversation.js'
import type { MessageRepository } from '../../domain/ports/message-repository.js'
import { PresenceTracker } from './presence-tracker.js'
import type { SocketUserData } from './socket-auth.js'
import { isMessageAllowed } from './message-rate-limiter.js'
import {
  formatError,
  parseCatchUpData,
  parseChannelId,
  parseConversationId,
  parseSendMessageData,
  parseTransferData,
} from './socket-parsers.js'

function getUserData(socket: Socket): SocketUserData {
  const user: unknown = socket.data['user']
  if (!isRecord(user)) {
    throw new Error('Socket user data not found')
  }
  return {
    userId: String(user['userId']),
    organizationId: String(user['organizationId']),
    role: String(user['role']),
    name: String(user['name']),
  }
}

export function setupSocketHandlers(
  io: Server,
  logger: AppLogger,
  redis: IORedis
): PresenceTracker {
  const presence = new PresenceTracker(io, logger)
  presence.start()
  io.on('connection', (socket: Socket) => {
    const user = getUserData(socket)
    const lobbyRoom = `tenant:${user.organizationId}:lobby`
    void socket.join(lobbyRoom)
    void socket.join(`tenant:${user.organizationId}:user:${user.userId}`)
    presence.heartbeat(user.organizationId, user.userId, user.name)
    logger.info(
      { userId: user.userId, orgId: user.organizationId },
      'Agent connected'
    )
    registerConversationEvents(socket, user, logger)
    registerMessageEvents(socket, user, logger)
    registerPresenceEvents(socket, user, presence, logger)
    registerCatchUpEvent(socket, user, logger)
    registerChannelStatusEvents(socket, user, logger, redis)
    socket.on('disconnect', () => {
      presence.removeAgent(user.organizationId, user.userId)
      io.to(lobbyRoom).emit(SOCKET_EVENTS.AGENT_STATUS_UPDATE, {
        agents: presence.getOnlineAgents(user.organizationId),
      })
      logger.info({ userId: user.userId }, 'Agent disconnected')
    })
  })
  return presence
}
function registerConversationEvents(
  socket: Socket,
  user: SocketUserData,
  logger: AppLogger
): void {
  socket.on(SOCKET_EVENTS.SUBSCRIBE_CONVERSATION, (data: unknown) => {
    const parsed = parseConversationId(data)
    if (!parsed) return
    void socket.join(`tenant:${user.organizationId}:conversation:${parsed}`)
    logger.debug(
      { userId: user.userId, conversationId: parsed },
      'Subscribed to conversation'
    )
  })
  socket.on(SOCKET_EVENTS.UNSUBSCRIBE_CONVERSATION, (data: unknown) => {
    const parsed = parseConversationId(data)
    if (!parsed) return
    void socket.leave(`tenant:${user.organizationId}:conversation:${parsed}`)
  })
  socket.on(
    SOCKET_EVENTS.ASSIGN_CONVERSATION,
    async (data: unknown, ack?: unknown) => {
      try {
        const parsed = parseConversationId(data)
        if (!parsed) return
        const useCase = container.resolve(AssignConversation)
        const result = await useCase.execute({
          conversationId: parsed,
          tenantId: user.organizationId,
          agentId: user.userId,
          agentName: user.name,
        })
        if (typeof ack === 'function') ack({ success: true, data: result })
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to assign conversation')
        if (typeof ack === 'function')
          ack({ success: false, error: formatError(err) })
      }
    }
  )
  socket.on(
    SOCKET_EVENTS.CLOSE_CONVERSATION,
    async (data: unknown, ack?: unknown) => {
      try {
        const parsed = parseConversationId(data)
        if (!parsed) return
        const useCase = container.resolve(CloseConversation)
        const result = await useCase.execute({
          conversationId: parsed,
          tenantId: user.organizationId,
          closedBy: user.userId,
          closedByName: user.name,
        })
        if (typeof ack === 'function') ack({ success: true, data: result })
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to close conversation')
        if (typeof ack === 'function')
          ack({ success: false, error: formatError(err) })
      }
    }
  )
  socket.on(
    SOCKET_EVENTS.TRANSFER_CONVERSATION,
    async (data: unknown, ack?: unknown) => {
      try {
        const transferData = parseTransferData(data)
        if (!transferData) return
        const useCase = container.resolve(TransferConversation)
        const result = await useCase.execute({
          conversationId: transferData.conversationId,
          tenantId: user.organizationId,
          targetAgentId: transferData.targetAgentId,
          targetAgentName: transferData.targetAgentName,
        })
        if (typeof ack === 'function') ack({ success: true, data: result })
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to transfer conversation')
        if (typeof ack === 'function')
          ack({ success: false, error: formatError(err) })
      }
    }
  )
}

function registerMessageEvents(
  socket: Socket,
  user: SocketUserData,
  logger: AppLogger
): void {
  socket.on(
    SOCKET_EVENTS.SEND_MESSAGE,
    async (data: unknown, ack?: unknown) => {
      if (!isMessageAllowed(user.userId)) {
        logger.warn({ userId: user.userId }, 'Message rate limit exceeded')
        if (typeof ack === 'function')
          ack({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many messages. Slow down.',
            },
          })
        return
      }
      try {
        const msgData = parseSendMessageData(data)
        if (!msgData) return
        const useCase = container.resolve(SendMessage)
        const result = await useCase.execute({
          tenantId: user.organizationId,
          conversationId: msgData.conversationId,
          senderId: user.userId,
          senderName: user.name,
          senderType: 'AGENT',
          text: msgData.text,
        })
        const messagePayload = {
          id: result.id,
          conversationId: msgData.conversationId,
          tenantId: user.organizationId,
          senderType: 'AGENT',
          senderName: user.name,
          senderId: user.userId,
          text: msgData.text,
          type: 'TEXT',
          status: 'PENDING',
          externalId: null,
          createdAt: result.createdAt,
        }
        const lobbyRoom = `tenant:${user.organizationId}:lobby`
        const convRoom = `tenant:${user.organizationId}:conversation:${msgData.conversationId}`
        socket.to(convRoom).emit(SOCKET_EVENTS.INCOMING_MESSAGE, messagePayload)
        socket
          .to(lobbyRoom)
          .except(convRoom)
          .emit(SOCKET_EVENTS.INCOMING_MESSAGE, messagePayload)
        if (typeof ack === 'function') ack({ success: true, data: result })
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to send message')
        if (typeof ack === 'function')
          ack({ success: false, error: formatError(err) })
      }
    }
  )
  socket.on(SOCKET_EVENTS.TYPING_START, (data: unknown) => {
    const parsed = parseConversationId(data)
    if (!parsed) return
    socket
      .to(`tenant:${user.organizationId}:conversation:${parsed}`)
      .emit(SOCKET_EVENTS.TYPING, {
        conversationId: parsed,
        userId: user.userId,
        name: user.name,
      })
  })
}
function registerPresenceEvents(
  socket: Socket,
  user: SocketUserData,
  presence: PresenceTracker,
  _logger: AppLogger
): void {
  socket.on(SOCKET_EVENTS.AGENT_HEARTBEAT, () => {
    presence.heartbeat(user.organizationId, user.userId, user.name)
  })
}

function registerCatchUpEvent(
  socket: Socket,
  user: SocketUserData,
  logger: AppLogger
): void {
  socket.on(SOCKET_EVENTS.CATCH_UP, async (data: unknown, ack?: unknown) => {
    try {
      const catchUpData = parseCatchUpData(data)
      if (!catchUpData) return
      const messageRepo =
        container.resolve<MessageRepository>('MessageRepository')
      const messages = await messageRepo.findAfterTimestamp(
        catchUpData.conversationIds,
        user.organizationId,
        catchUpData.after,
        CHAT_LIMITS.CATCH_UP_MAX_MESSAGES
      )
      if (typeof ack === 'function') ack({ success: true, data: messages })
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to catch up messages')
      if (typeof ack === 'function')
        ack({ success: false, error: formatError(err) })
    }
  })
}

function registerChannelStatusEvents(
  socket: Socket,
  user: SocketUserData,
  logger: AppLogger,
  redis: IORedis
): void {
  socket.on(
    SOCKET_EVENTS.CHANNEL_STATUS_GET,
    async (data: unknown, ack?: unknown) => {
      try {
        const channelId = parseChannelId(data)
        if (!channelId) return
        const channel = await Channel.findOne({
          _id: channelId,
          tenantId: user.organizationId,
        }).lean()
        if (!channel) {
          if (typeof ack === 'function') {
            ack({
              success: false,
              error: { code: 'NOT_FOUND', message: 'Canal não encontrado' },
            })
          }
          return
        }
        const [state, qr] = await Promise.all([
          redis.get(WHATSAPP_STATE_KEYS.state(channelId)),
          redis.get(WHATSAPP_STATE_KEYS.lastQr(channelId)),
        ])
        if (typeof ack === 'function') {
          ack({
            success: true,
            data: {
              state: state ?? 'disconnected',
              qr: qr ?? null,
            },
          })
        }
      } catch (err: unknown) {
        logger.error({ err }, 'Failed to get channel status')
        if (typeof ack === 'function')
          ack({ success: false, error: formatError(err) })
      }
    }
  )
}
