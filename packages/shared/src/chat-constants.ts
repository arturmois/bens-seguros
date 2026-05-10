export const CHAT_QUEUES = {
  SEND_MESSAGE: 'chat-send-message',
  PROCESS_INCOMING: 'chat-process-incoming',
  AI_BOT: 'chat-ai-bot',
  AUTO_CLOSE: 'chat-auto-close',
  CONNECT_CHANNEL: 'chat-connect-channel',
  DISCONNECT_CHANNEL: 'chat-disconnect-channel',
  PAIR_CHANNEL: 'chat-pair-channel',
  DEAD_LETTER: 'chat-dead-letter',
  META_TOKEN_REFRESH: 'chat-meta-token-refresh',
} as const

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
  MAX_CHANNELS_PER_ORG: 20,
  MAX_WEB_CHAT_CHANNELS_PER_ORG: 5,
  MAX_WIDGET_ORIGINS_PER_CHANNEL: 10,
  MAX_WIDGET_CONNECTIONS_PER_CHANNEL: 500,
  WIDGET_RATE_LIMIT_PER_MIN: 30,
  WIDGET_SOCKET_RATE_LIMIT_PER_SEC: 5,
  VISITOR_TOKEN_TTL_HOURS: 24,
} as const

export const CHAT_PUBSUB_CHANNELS = {
  INCOMING_MESSAGE: 'chat:pub:incoming-message',
  MESSAGE_STATUS: 'chat:pub:message-status',
  CHANNEL_STATUS: 'chat:pub:channel-status',
  CONVERSATION_UPDATE: 'chat:pub:conversation-update',
  UNREAD_UPDATE: 'chat:pub:unread-update',
  PAIRING_CODE_RESULT: 'chat:pub:pairing-code-result',
} as const

export const WHATSAPP_STATE_KEYS = {
  state: (channelId: string): string => `whatsapp:state:${channelId}`,
  lastQr: (channelId: string): string => `whatsapp:last_qr:${channelId}`,
} as const

export const CHAT_CLIENT_COMMANDS = {
  CLOSE: '/fim',
} as const

export const CLIENT_CLOSE_SYSTEM_MESSAGE =
  'Atendimento encerrado pelo cliente via comando /fim'

export const CLIENT_CLOSE_CONFIRMATION_TEXT =
  'Atendimento encerrado. Caso precise, é só enviar uma nova mensagem que abriremos outro atendimento.'

export const AUTO_CLOSE_SYSTEM_MESSAGE = 'Atendimento encerrado por inatividade'
