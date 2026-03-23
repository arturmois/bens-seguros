export const SOCKET_EVENTS = {
  // Chat messages
  INCOMING_MESSAGE: 'chat:incoming-message',
  MESSAGE_STATUS: 'chat:message-status',
  SEND_MESSAGE: 'chat:send-message',

  // Conversations
  SUBSCRIBE_CONVERSATION: 'chat:subscribe-conversation',
  UNSUBSCRIBE_CONVERSATION: 'chat:unsubscribe-conversation',
  ASSIGN_CONVERSATION: 'chat:assign-conversation',
  CLOSE_CONVERSATION: 'chat:close-conversation',
  TRANSFER_CONVERSATION: 'chat:transfer-conversation',
  CONVERSATION_UPDATED: 'chat:conversation-updated',
  RETURN_TO_BOT: 'chat:return-to-bot',

  // Unread
  UNREAD_UPDATE: 'chat:unread-update',

  // Presence
  AGENT_HEARTBEAT: 'agent:heartbeat',
  AGENT_STATUS_UPDATE: 'agent:status-update',

  // Typing
  TYPING_START: 'conversation:typing-start',
  TYPING: 'conversation:typing',

  // Channel
  CHANNEL_STATUS: 'channel:status',
  CHANNEL_STATUS_GET: 'channel:status:get',
  PAIRING_CODE_RESULT: 'channel:pairing-code-result',

  // Catch-up
  CATCH_UP: 'chat:catch-up',

  // Notifications (Fase 6)
  NOTIFICATION: 'notification',
} as const

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
