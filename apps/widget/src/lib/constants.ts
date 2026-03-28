export const CHAT_SERVER_URL: string =
  import.meta.env.VITE_CHAT_SERVER_URL ?? 'http://localhost:3002'

export const WIDGET_DIMENSIONS = {
  WIDTH: 380,
  HEIGHT: 520,
  BUTTON_SIZE: 56,
  BUTTON_MARGIN: 24,
  MOBILE_BREAKPOINT: 480,
} as const

export const ANIMATION_DURATION_MS = 200

// Canonical source: packages/shared/src/socket-events.ts — keep in sync
export const SOCKET_EVENTS = {
  WIDGET_SEND_MESSAGE: 'widget:send-message',
  WIDGET_TYPING_START: 'widget:typing-start',
  WIDGET_INCOMING_MESSAGE: 'widget:incoming-message',
  WIDGET_TYPING: 'widget:typing',
  WIDGET_CONVERSATION_UPDATED: 'widget:conversation-updated',
} as const
