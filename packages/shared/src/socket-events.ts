export const SOCKET_EVENTS = {
  // Chat
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  MESSAGE_STATUS: 'message_status',
  CONVERSATION_OPENED: 'conversation_opened',
  CONVERSATION_CLOSED: 'conversation_closed',
  CONVERSATION_ASSIGNED: 'conversation_assigned',
  // Presence
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_TYPING: 'user_typing',
  // WhatsApp
  WHATSAPP_STATUS: 'whatsapp_status',
  WHATSAPP_QR: 'whatsapp_qr',
  // Notifications
  NOTIFICATION: 'notification',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
