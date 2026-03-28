import { useCallback, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Phone mask helper
// ---------------------------------------------------------------------------

function formatBrPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function isValidBrPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--widget-text)',
  marginBottom: '4px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  lineHeight: '1.4',
  color: 'var(--widget-text)',
  backgroundColor: 'var(--widget-bg)',
  border: '1px solid var(--widget-border)',
  borderRadius: 'var(--widget-radius-input)',
  outline: 'none',
  transition: 'border-color var(--widget-transition)',
}

const inputFocusColor = 'var(--widget-primary)'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PreChatFormProps {
  readonly welcomeMessage: string
  readonly isSubmitting: boolean
  readonly onSubmit: (params: {
    name: string
    phone: string
    email?: string
  }) => Promise<void>
}

export function PreChatForm({
  welcomeMessage,
  isSubmitting,
  onSubmit,
}: PreChatFormProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const isNameValid = name.trim().length >= 2
  const isPhoneValid = isValidBrPhone(phone)
  const isFormValid = isNameValid && isPhoneValid

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhone(formatBrPhone(e.target.value))
    },
    []
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!isFormValid || isSubmitting) return

      void onSubmit({
        name: name.trim(),
        phone,
        email: email.trim() || undefined,
      })
    },
    [isFormValid, isSubmitting, name, phone, email, onSubmit]
  )

  const handleInputFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = inputFocusColor
    },
    []
  )

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = 'var(--widget-border)'
    },
    []
  )

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        overflowY: 'auto',
      }}
    >
      {/* Welcome message */}
      <p
        style={{
          fontSize: '14px',
          color: 'var(--widget-text-secondary)',
          marginBottom: '20px',
          lineHeight: '1.5',
        }}
      >
        {welcomeMessage}
      </p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          flex: 1,
        }}
        noValidate
      >
        {/* Name */}
        <div>
          <label htmlFor="widget-name" style={labelStyle}>
            Nome <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="widget-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Seu nome completo"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            style={inputStyle}
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="widget-phone" style={labelStyle}>
            Telefone <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="widget-phone"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="(11) 99999-9999"
            required
            autoComplete="tel"
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="widget-email" style={labelStyle}>
            E-mail{' '}
            <span
              style={{ color: 'var(--widget-text-muted)', fontWeight: 400 }}
            >
              (opcional)
            </span>
          </label>
          <input
            id="widget-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="seu@email.com"
            autoComplete="email"
            style={inputStyle}
          />
        </div>

        {/* Spacer to push button and LGPD to bottom */}
        <div style={{ flex: 1, minHeight: '8px' }} />

        {/* Submit button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--widget-primary-text)',
            backgroundColor:
              isFormValid && !isSubmitting
                ? 'var(--widget-primary)'
                : 'var(--widget-bg-tertiary)',
            borderRadius: 'var(--widget-radius-input)',
            border: 'none',
            cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
            transition:
              'background-color var(--widget-transition), opacity var(--widget-transition)',
            opacity: isFormValid && !isSubmitting ? 1 : 0.6,
            minHeight: '44px',
          }}
        >
          {isSubmitting ? 'Iniciando...' : 'Iniciar conversa'}
        </button>

        {/* LGPD notice */}
        <p
          style={{
            fontSize: '11px',
            color: 'var(--widget-text-muted)',
            lineHeight: '1.4',
            textAlign: 'center',
          }}
        >
          Ao iniciar a conversa, você concorda com o tratamento dos seus dados
          pessoais conforme a LGPD (Lei Geral de Proteção de Dados).
        </p>
      </form>
    </div>
  )
}
