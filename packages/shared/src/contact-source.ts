export const CONTACT_SOURCE_VALUES = [
  'MANUAL',
  'CHAT_WHATSAPP',
  'CHAT_WIDGET',
  'FORM_WEB',
  'IMPORT',
  'REFERRAL',
] as const

export type ContactSource = (typeof CONTACT_SOURCE_VALUES)[number]

const CONTACT_SOURCE_VALUES_SET: ReadonlySet<string> = new Set(
  CONTACT_SOURCE_VALUES
)

export function isContactSource(value: unknown): value is ContactSource {
  return typeof value === 'string' && CONTACT_SOURCE_VALUES_SET.has(value)
}
