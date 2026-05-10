export const SOCKET_EVENTS = {
  INCOMING_MESSAGE: 'chat:incoming-message',
  MESSAGE_STATUS: 'chat:message-status',
  SEND_MESSAGE: 'chat:send-message',

  SUBSCRIBE_CONVERSATION: 'chat:subscribe-conversation',
  UNSUBSCRIBE_CONVERSATION: 'chat:unsubscribe-conversation',
  ASSIGN_CONVERSATION: 'chat:assign-conversation',
  CLOSE_CONVERSATION: 'chat:close-conversation',
  TRANSFER_CONVERSATION: 'chat:transfer-conversation',
  CONVERSATION_UPDATED: 'chat:conversation-updated',
  RETURN_TO_BOT: 'chat:return-to-bot',

  UNREAD_UPDATE: 'chat:unread-update',

  AGENT_HEARTBEAT: 'agent:heartbeat',
  AGENT_STATUS_UPDATE: 'agent:status-update',

  TYPING_START: 'conversation:typing-start',
  TYPING: 'conversation:typing',

  CHANNEL_STATUS: 'channel:status',
  CHANNEL_STATUS_GET: 'channel:status:get',
  PAIRING_CODE_RESULT: 'channel:pairing-code-result',

  CATCH_UP: 'chat:catch-up',

  NOTIFICATION: 'notification',

  WIDGET_SEND_MESSAGE: 'widget:send-message',
  WIDGET_TYPING_START: 'widget:typing-start',
  WIDGET_INCOMING_MESSAGE: 'widget:incoming-message',
  WIDGET_TYPING: 'widget:typing',
  WIDGET_CONVERSATION_UPDATED: 'widget:conversation-updated',
} as const

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
