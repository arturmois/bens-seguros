import { useCallback, useRef, useState } from 'react'

interface MessageInputProps {
  readonly onSend: (text: string) => void
  readonly onTyping: () => void
}

export function MessageInput({
  onSend,
  onTyping,
}: MessageInputProps): React.JSX.Element {
  const [text, setText] = useState('')
  const lastTypingEmitRef = useRef(0)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = text.trim()
      if (!trimmed) return

      onSend(trimmed)
      setText('')
    },
    [text, onSend]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setText(e.target.value)

      // Throttle typing events to 1 per second
      const now = Date.now()
      if (now - lastTypingEmitRef.current > 1000) {
        lastTypingEmitRef.current = now
        onTyping()
      }
    },
    [onTyping]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const trimmed = text.trim()
        if (!trimmed) return

        onSend(trimmed)
        setText('')
      }
    },
    [text, onSend]
  )

  const hasText = text.trim().length > 0

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderTop: '1px solid var(--widget-border)',
        backgroundColor: 'var(--widget-bg)',
        flexShrink: 0,
      }}
    >
      <input
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua mensagem..."
        maxLength={4096}
        autoComplete="off"
        aria-label="Mensagem"
        style={{
          flex: 1,
          padding: '10px 12px',
          fontSize: '14px',
          color: 'var(--widget-text)',
          backgroundColor: 'var(--widget-bg-secondary)',
          border: '1px solid var(--widget-border)',
          borderRadius: 'var(--widget-radius-input)',
          outline: 'none',
          transition: 'border-color var(--widget-transition)',
          minHeight: '44px',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--widget-primary)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--widget-border)'
        }}
      />
      <button
        type="submit"
        disabled={!hasText}
        aria-label="Enviar mensagem"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: hasText
            ? 'var(--widget-primary)'
            : 'var(--widget-bg-tertiary)',
          color: hasText ? '#ffffff' : 'var(--widget-text-muted)',
          border: 'none',
          cursor: hasText ? 'pointer' : 'default',
          transition:
            'background-color var(--widget-transition), color var(--widget-transition)',
          flexShrink: 0,
          padding: 0,
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
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      </button>
    </form>
  )
}
