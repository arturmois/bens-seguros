import { WIDGET_DIMENSIONS } from '../lib/constants'
import type { WidgetState } from '../hooks/use-widget-state'
import { ChatView } from './chat-view'
import { PreChatForm } from './pre-chat-form'

interface WidgetContainerProps {
  readonly widgetState: WidgetState
  readonly onClose: () => void
  readonly primaryColor: string
}

export function WidgetContainer({
  widgetState,
  onClose,
  primaryColor,
}: WidgetContainerProps): React.JSX.Element {
  const channelName = widgetState.config?.name ?? 'Chat'
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: `${WIDGET_DIMENSIONS.WIDTH}px`,
        height: `${WIDGET_DIMENSIONS.HEIGHT}px`,
        maxWidth: '100vw',
        maxHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--widget-bg)',
        borderRadius: `var(--widget-radius-container) var(--widget-radius-container) 0 0`,
        boxShadow: 'var(--widget-shadow)',
        overflow: 'hidden',
        fontFamily: 'var(--widget-font-family)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          backgroundColor: primaryColor,
          color: '#ffffff',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: '15px',
            lineHeight: '1.3',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginRight: '8px',
          }}
        >
          {channelName}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar chat"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: '6px',
            color: '#ffffff',
            background: 'rgba(255, 255, 255, 0.15)',
            transition: 'background var(--widget-transition)',
            cursor: 'pointer',
            border: 'none',
            padding: 0,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {/* Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {widgetState.phase === 'form' && (
          <PreChatForm
            welcomeMessage={widgetState.config.welcomeMessage}
            isSubmitting={widgetState.isSubmitting}
            onSubmit={widgetState.startChat}
          />
        )}
        {widgetState.phase === 'chat' && (
          <ChatView
            conversationId={widgetState.conversation.conversationId}
            visitorToken={widgetState.conversation.visitorToken}
            primaryColor={primaryColor}
          />
        )}
      </div>
      {/* Footer */}
      <div
        style={{
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--widget-text-muted)',
          borderTop: '1px solid var(--widget-border)',
          flexShrink: 0,
        }}
      >
        Powered by <span style={{ fontWeight: 600 }}>Bens Seguros</span>
      </div>
    </div>
  )
}
