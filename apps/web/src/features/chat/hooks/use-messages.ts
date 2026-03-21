'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS, CHAT_LIMITS } from '@repo/shared';

import { chatApi } from '../lib/chat-api';
import { MESSAGES_KEY } from '../lib/constants';
import type {
  ConversationData,
  ConversationWithDetails,
  ContactData,
  MessageData,
  MessageStatus,
} from '../types';

interface UseMessagesReturn {
  readonly messages: MessageData[];
  readonly contact: ContactData | null;
  readonly conversation: ConversationData | null;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly sendMessage: (text: string) => void;
  readonly emitTyping: () => void;
  readonly typingUser: string | null;
}

export function useMessages(
  conversationId: string | null,
  socket: Socket | null,
): UseMessagesReturn {
  const queryClient = useQueryClient();
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  const query = useQuery({
    queryKey: [MESSAGES_KEY, conversationId],
    queryFn: async (): Promise<ConversationWithDetails> => {
      const response = await chatApi.get<ConversationWithDetails>(
        `/chat/conversations/${conversationId}`,
      );
      return response.data;
    },
    staleTime: 60_000,
    enabled: conversationId !== null && conversationId.length > 0,
  });

  // Subscribe/unsubscribe to conversation room + mark as read
  useEffect(() => {
    if (!socket?.connected || !conversationId) return;

    socket.emit(SOCKET_EVENTS.SUBSCRIBE_CONVERSATION, { conversationId });

    void chatApi.post(`/chat/conversations/${conversationId}/read`, {});

    return () => {
      socket.emit(SOCKET_EVENTS.UNSUBSCRIBE_CONVERSATION, { conversationId });
    };
  }, [socket, conversationId]);

  // Real-time message listener
  const handleIncomingMessage = useCallback(
    (payload: unknown) => {
      if (!isIncomingMessageEvent(payload)) return;
      if (payload.conversationId !== conversationId) return;

      queryClient.setQueryData<ConversationWithDetails>([MESSAGES_KEY, conversationId], (prev) => {
        if (!prev) return prev;

        const alreadyExists = prev.messages.some((m) => m.id === payload.id);
        if (alreadyExists) return prev;

        return {
          ...prev,
          messages: [...prev.messages, payload],
        };
      });
    },
    [queryClient, conversationId],
  );

  // Message status listener
  const handleMessageStatus = useCallback(
    (payload: unknown) => {
      if (!isMessageStatusEvent(payload)) return;
      if (payload.conversationId !== conversationId) return;

      queryClient.setQueryData<ConversationWithDetails>([MESSAGES_KEY, conversationId], (prev) => {
        if (!prev) return prev;

        const updated = prev.messages.map((msg) => {
          if (msg.id !== payload.messageId) return msg;
          return { ...msg, status: payload.status };
        });

        return { ...prev, messages: updated };
      });
    },
    [queryClient, conversationId],
  );

  // Typing indicator listener
  const handleTyping = useCallback(
    (payload: unknown) => {
      if (!isTypingEvent(payload)) return;
      if (payload.conversationId !== conversationId) return;

      setTypingUser(payload.name);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser(null);
      }, CHAT_LIMITS.TYPING_TIMEOUT_MS);
    },
    [conversationId],
  );

  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.INCOMING_MESSAGE, handleIncomingMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_STATUS, handleMessageStatus);
    socket.on(SOCKET_EVENTS.TYPING, handleTyping);

    return () => {
      socket.off(SOCKET_EVENTS.INCOMING_MESSAGE, handleIncomingMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_STATUS, handleMessageStatus);
      socket.off(SOCKET_EVENTS.TYPING, handleTyping);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket, handleIncomingMessage, handleMessageStatus, handleTyping]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!socket?.connected || !conversationId || !text.trim()) return;

      const optimisticMessage: MessageData = {
        id: `temp-${Date.now()}`,
        conversationId,
        tenantId: '',
        senderType: 'AGENT',
        senderName: null,
        senderId: null,
        text: text.trim(),
        type: 'TEXT',
        status: 'PENDING',
        externalId: null,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ConversationWithDetails>([MESSAGES_KEY, conversationId], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, optimisticMessage],
        };
      });

      socket.emit(
        SOCKET_EVENTS.SEND_MESSAGE,
        { conversationId, text: text.trim() },
        (response: unknown) => {
          if (!isSendMessageAck(response) || !response.success) {
            queryClient.setQueryData<ConversationWithDetails>(
              [MESSAGES_KEY, conversationId],
              (prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  messages: prev.messages.map((msg) =>
                    msg.id === optimisticMessage.id ? { ...msg, status: 'FAILED' as const } : msg,
                  ),
                };
              },
            );
            return;
          }

          queryClient.setQueryData<ConversationWithDetails>(
            [MESSAGES_KEY, conversationId],
            (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages.map((msg) =>
                  msg.id === optimisticMessage.id && isRecord(response.data)
                    ? { ...msg, id: String(response.data['id'] ?? msg.id), status: 'SENT' as const }
                    : msg,
                ),
              };
            },
          );
        },
      );
    },
    [socket, conversationId, queryClient],
  );

  // Emit typing start (debounced)
  const emitTyping = useCallback(() => {
    if (!socket?.connected || !conversationId) return;

    const now = Date.now();
    if (now - lastTypingEmitRef.current < CHAT_LIMITS.TYPING_DEBOUNCE_MS) return;

    lastTypingEmitRef.current = now;
    socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
  }, [socket, conversationId]);

  const sendMessageWithTypingReset = useCallback(
    (text: string) => {
      lastTypingEmitRef.current = 0;
      sendMessage(text);
    },
    [sendMessage],
  );

  return {
    messages: query.data?.messages ?? [],
    contact: query.data?.contact ?? null,
    conversation: query.data?.conversation ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    sendMessage: sendMessageWithTypingReset,
    emitTyping,
    typingUser,
  };
}

// --- type guards ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIncomingMessageEvent(data: unknown): data is MessageData {
  if (!isRecord(data)) return false;
  return typeof data['id'] === 'string' && typeof data['conversationId'] === 'string';
}

interface MessageStatusEvent {
  conversationId: string;
  messageId: string;
  status: MessageStatus;
}

function isMessageStatusEvent(data: unknown): data is MessageStatusEvent {
  if (!isRecord(data)) return false;
  return (
    typeof data['conversationId'] === 'string' &&
    typeof data['messageId'] === 'string' &&
    typeof data['status'] === 'string'
  );
}

interface TypingEvent {
  conversationId: string;
  userId: string;
  name: string;
}

function isTypingEvent(data: unknown): data is TypingEvent {
  if (!isRecord(data)) return false;
  return (
    typeof data['conversationId'] === 'string' &&
    typeof data['userId'] === 'string' &&
    typeof data['name'] === 'string'
  );
}

interface SendMessageAck {
  success: boolean;
  data?: unknown;
}

function isSendMessageAck(data: unknown): data is SendMessageAck {
  if (!isRecord(data)) return false;
  return typeof data['success'] === 'boolean';
}
