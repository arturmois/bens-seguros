import { describe, expect, it } from 'vitest'
import { CONTACT_SOURCE_VALUES, isContactSource } from './contact-source.js'
import type { ContactSource } from './contact-source.js'

describe('ContactSource', () => {
  it('ContactSource union has the six Prisma enum values', () => {
    const expected: readonly ContactSource[] = [
      'MANUAL',
      'CHAT_WHATSAPP',
      'CHAT_WIDGET',
      'FORM_WEB',
      'IMPORT',
      'REFERRAL',
    ]
    expect(CONTACT_SOURCE_VALUES).toEqual(expected)
    expect(CONTACT_SOURCE_VALUES).toHaveLength(6)
    expect(isContactSource('MANUAL')).toBe(true)
    expect(isContactSource('WHATSAPP_BOT')).toBe(false)
  })
})
