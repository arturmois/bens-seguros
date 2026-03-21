export const CHAT_QUEUES = {
  SEND_MESSAGE: 'chat-send-message',
  PROCESS_INCOMING: 'chat-process-incoming',
  AI_BOT: 'chat-ai-bot',
  AUTO_CLOSE: 'chat-auto-close',
  DEAD_LETTER: 'chat-dead-letter',
} as const;

export const CHAT_LIMITS = {
  MAX_CONVERSATIONS_PER_ORG: 50,
  MAX_BAILEYS_CHANNELS_PER_ORG: 10,
  MAX_SOCKET_CONNECTIONS_PER_ORG: 100,
  MAX_MESSAGES_DISPLAY: 1000,
  CONVERSATIONS_PER_PAGE: 50,
  MESSAGES_PER_PAGE: 50,
  CATCH_UP_MAX_MESSAGES: 100,
  AUTO_CLOSE_HOURS: 24,
  HEARTBEAT_INTERVAL_MS: 30_000,
  HEARTBEAT_TIMEOUT_MS: 120_000,
  TYPING_DEBOUNCE_MS: 2_000,
  TYPING_TIMEOUT_MS: 5_000,
  UNASSIGNED_NOTIFY_TIMEOUT_MS: 300_000,
  MAX_AI_RESPONSES_PER_CONVERSATION: 20,
} as const;

export const CHAT_PUBSUB_CHANNELS = {
  INCOMING_MESSAGE: 'chat:pub:incoming-message',
  MESSAGE_STATUS: 'chat:pub:message-status',
  CHANNEL_STATUS: 'chat:pub:channel-status',
  CONVERSATION_UPDATE: 'chat:pub:conversation-update',
  UNREAD_UPDATE: 'chat:pub:unread-update',
} as const;
