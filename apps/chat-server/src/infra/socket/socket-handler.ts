import type { Server, Socket } from 'socket.io';
import type { AppLogger } from '../logger.js';
import { container } from 'tsyringe';
import { SOCKET_EVENTS, CHAT_LIMITS, isRecord } from '@repo/shared';

import { SendMessage } from '../../application/send-message.js';
import { AssignConversation } from '../../application/assign-conversation.js';
import { CloseConversation } from '../../application/close-conversation.js';
import { TransferConversation } from '../../application/transfer-conversation.js';
import type { MessageRepository } from '../../domain/ports/message-repository.js';
import type { SocketUserData } from './socket-auth.js';
import { PresenceTracker } from './presence-tracker.js';
import {
  parseConversationId,
  parseTransferData,
  parseSendMessageData,
  parseCatchUpData,
  formatError,
} from './socket-parsers.js';

function getUserData(socket: Socket): SocketUserData {
  const user: unknown = socket.data['user'];
  if (!isRecord(user)) {
    throw new Error('Socket user data not found');
  }
  return {
    userId: String(user['userId']),
    organizationId: String(user['organizationId']),
    role: String(user['role']),
    name: String(user['name']),
  };
}

export function setupSocketHandlers(io: Server, logger: AppLogger): PresenceTracker {
  const presence = new PresenceTracker(io, logger);
  presence.start();

  io.on('connection', (socket: Socket) => {
    const user = getUserData(socket);
    const lobbyRoom = `tenant:${user.organizationId}:lobby`;

    void socket.join(lobbyRoom);
    presence.heartbeat(user.organizationId, user.userId, user.name);

    logger.info({ userId: user.userId, orgId: user.organizationId }, 'Agent connected');

    registerConversationEvents(socket, user, logger);
    registerMessageEvents(socket, user, logger);
    registerPresenceEvents(socket, user, presence, logger);
    registerCatchUpEvent(socket, user, logger);

    socket.on('disconnect', () => {
      presence.removeAgent(user.organizationId, user.userId);
      io.to(lobbyRoom).emit(SOCKET_EVENTS.AGENT_STATUS_UPDATE, {
        agents: presence.getOnlineAgents(user.organizationId),
      });
      logger.info({ userId: user.userId }, 'Agent disconnected');
    });
  });

  return presence;
}

function registerConversationEvents(socket: Socket, user: SocketUserData, logger: AppLogger): void {
  socket.on(SOCKET_EVENTS.SUBSCRIBE_CONVERSATION, (data: unknown) => {
    const parsed = parseConversationId(data);
    if (!parsed) return;
    void socket.join(`tenant:${user.organizationId}:conversation:${parsed}`);
    logger.debug({ userId: user.userId, conversationId: parsed }, 'Subscribed to conversation');
  });

  socket.on(SOCKET_EVENTS.UNSUBSCRIBE_CONVERSATION, (data: unknown) => {
    const parsed = parseConversationId(data);
    if (!parsed) return;
    void socket.leave(`tenant:${user.organizationId}:conversation:${parsed}`);
  });

  socket.on(SOCKET_EVENTS.ASSIGN_CONVERSATION, async (data: unknown, ack?: unknown) => {
    try {
      const parsed = parseConversationId(data);
      if (!parsed) return;
      const useCase = container.resolve(AssignConversation);
      const result = await useCase.execute({
        conversationId: parsed,
        tenantId: user.organizationId,
        agentId: user.userId,
        agentName: user.name,
      });
      if (typeof ack === 'function') ack({ success: true, data: result });
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to assign conversation');
      if (typeof ack === 'function') ack({ success: false, error: formatError(err) });
    }
  });

  socket.on(SOCKET_EVENTS.CLOSE_CONVERSATION, async (data: unknown, ack?: unknown) => {
    try {
      const parsed = parseConversationId(data);
      if (!parsed) return;
      const useCase = container.resolve(CloseConversation);
      const result = await useCase.execute({
        conversationId: parsed,
        tenantId: user.organizationId,
        closedBy: user.userId,
        closedByName: user.name,
      });
      if (typeof ack === 'function') ack({ success: true, data: result });
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to close conversation');
      if (typeof ack === 'function') ack({ success: false, error: formatError(err) });
    }
  });

  socket.on(SOCKET_EVENTS.TRANSFER_CONVERSATION, async (data: unknown, ack?: unknown) => {
    try {
      const transferData = parseTransferData(data);
      if (!transferData) return;
      const useCase = container.resolve(TransferConversation);
      const result = await useCase.execute({
        conversationId: transferData.conversationId,
        tenantId: user.organizationId,
        targetAgentId: transferData.targetAgentId,
        targetAgentName: transferData.targetAgentName,
      });
      if (typeof ack === 'function') ack({ success: true, data: result });
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to transfer conversation');
      if (typeof ack === 'function') ack({ success: false, error: formatError(err) });
    }
  });
}

function registerMessageEvents(socket: Socket, user: SocketUserData, logger: AppLogger): void {
  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data: unknown, ack?: unknown) => {
    try {
      const msgData = parseSendMessageData(data);
      if (!msgData) return;
      const useCase = container.resolve(SendMessage);
      const result = await useCase.execute({
        tenantId: user.organizationId,
        conversationId: msgData.conversationId,
        senderId: user.userId,
        senderName: user.name,
        senderType: 'AGENT',
        text: msgData.text,
      });
      if (typeof ack === 'function') ack({ success: true, data: result });
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to send message');
      if (typeof ack === 'function') ack({ success: false, error: formatError(err) });
    }
  });

  socket.on(SOCKET_EVENTS.TYPING_START, (data: unknown) => {
    const parsed = parseConversationId(data);
    if (!parsed) return;
    socket
      .to(`tenant:${user.organizationId}:conversation:${parsed}`)
      .emit(SOCKET_EVENTS.TYPING, { conversationId: parsed, userId: user.userId, name: user.name });
  });
}

function registerPresenceEvents(
  socket: Socket,
  user: SocketUserData,
  presence: PresenceTracker,
  _logger: AppLogger,
): void {
  socket.on(SOCKET_EVENTS.AGENT_HEARTBEAT, () => {
    presence.heartbeat(user.organizationId, user.userId, user.name);
  });
}

function registerCatchUpEvent(socket: Socket, user: SocketUserData, logger: AppLogger): void {
  socket.on(SOCKET_EVENTS.CATCH_UP, async (data: unknown, ack?: unknown) => {
    try {
      const catchUpData = parseCatchUpData(data);
      if (!catchUpData) return;
      const messageRepo = container.resolve<MessageRepository>('MessageRepository');
      const messages = await messageRepo.findAfterTimestamp(
        catchUpData.conversationIds,
        catchUpData.after,
        CHAT_LIMITS.CATCH_UP_MAX_MESSAGES,
      );
      if (typeof ack === 'function') ack({ success: true, data: messages });
    } catch (err: unknown) {
      logger.error({ err }, 'Failed to catch up messages');
      if (typeof ack === 'function') ack({ success: false, error: formatError(err) });
    }
  });
}
