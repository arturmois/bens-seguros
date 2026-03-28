import type { WidgetMessage } from '../lib/widget-api'

interface MessageBubbleProps {
  readonly message: WidgetMessage
  readonly primaryColor: string
}

function formatTime(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function MessageBubble({
  message,
  primaryColor,
}: MessageBubbleProps): React.JSX.Element {
  const { senderType, text, senderName, createdAt, status } = message

  // System messages: centered, italic
  if (senderType === 'SYSTEM') {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '8px 16px',
          margin: '4px 0',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            fontStyle: 'italic',
            color: 'var(--widget-bubble-system-text)',
            lineHeight: '1.4',
          }}
        >
          {text}
        </p>
      </div>
    )
  }

  const isSent = senderType === 'CLIENT'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isSent ? 'flex-end' : 'flex-start',
        margin: '2px 0',
        maxWidth: '100%',
      }}
    >
      {/* Sender name for received messages */}
      {!isSent && senderName && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--widget-text-muted)',
            marginBottom: '2px',
            marginLeft: '4px',
          }}
        >
          {senderName}
        </span>
      )}

      <div
        style={{
          maxWidth: '80%',
          padding: '10px 14px',
          borderRadius: isSent
            ? 'var(--widget-radius-bubble) var(--widget-radius-bubble) 4px var(--widget-radius-bubble)'
            : 'var(--widget-radius-bubble) var(--widget-radius-bubble) var(--widget-radius-bubble) 4px',
          backgroundColor: isSent
            ? primaryColor
            : 'var(--widget-bubble-received-bg)',
          color: isSent
            ? 'var(--widget-bubble-sent-text)'
            : 'var(--widget-bubble-received-text)',
          wordBreak: 'break-word',
        }}
      >
        <p
          style={{
            fontSize: '14px',
            lineHeight: '1.45',
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {text}
        </p>
      </div>

      {/* Timestamp and status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '2px',
          padding: '0 4px',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: 'var(--widget-text-muted)',
          }}
        >
          {formatTime(createdAt)}
        </span>
        {isSent && status === 'SENDING' && (
          <span
            style={{
              fontSize: '10px',
              color: 'var(--widget-text-muted)',
            }}
          >
            Enviando...
          </span>
        )}
        {isSent && status === 'FAILED' && (
          <span
            style={{
              fontSize: '10px',
              color: '#ef4444',
            }}
          >
            Falha ao enviar
          </span>
        )}
      </div>
    </div>
  )
}
