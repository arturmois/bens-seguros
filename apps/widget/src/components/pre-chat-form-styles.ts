export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--widget-text)',
  marginBottom: '4px',
}

export const inputStyle: React.CSSProperties = {
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

export const INPUT_FOCUS_COLOR = 'var(--widget-primary)'

export function formatBrPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function isValidBrPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 || digits.length === 11
}
