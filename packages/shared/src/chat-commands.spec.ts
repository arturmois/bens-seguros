import { describe, expect, it } from 'vitest'

import { detectClientCommand } from './chat-commands'

describe('detectClientCommand', () => {
  it('returns "CLOSE" for exact "/fim" with type TEXT', () => {
    expect(detectClientCommand('/fim', 'TEXT')).toBe('CLOSE')
  })
  it('trims surrounding whitespace', () => {
    expect(detectClientCommand('  /fim  ', 'TEXT')).toBe('CLOSE')
    expect(detectClientCommand('\t/fim\n', 'TEXT')).toBe('CLOSE')
  })
  it('is case-insensitive', () => {
    expect(detectClientCommand('/FIM', 'TEXT')).toBe('CLOSE')
    expect(detectClientCommand('/Fim', 'TEXT')).toBe('CLOSE')
  })
  it('returns null when slash is missing', () => {
    expect(detectClientCommand('fim', 'TEXT')).toBeNull()
  })
  it('returns null for partial matches', () => {
    expect(detectClientCommand('/fim por hoje', 'TEXT')).toBeNull()
    expect(detectClientCommand('confirmar /fim', 'TEXT')).toBeNull()
  })
  it('returns null for unrelated text', () => {
    expect(detectClientCommand('olá', 'TEXT')).toBeNull()
    expect(detectClientCommand('', 'TEXT')).toBeNull()
  })
  it('returns null for null/undefined text', () => {
    expect(detectClientCommand(null, 'TEXT')).toBeNull()
    expect(detectClientCommand(undefined, 'TEXT')).toBeNull()
  })
  it('returns null when type is not TEXT', () => {
    expect(detectClientCommand('/fim', 'IMAGE')).toBeNull()
    expect(detectClientCommand('/fim', 'AUDIO')).toBeNull()
    expect(detectClientCommand('/fim', 'VIDEO')).toBeNull()
    expect(detectClientCommand('/fim', 'DOCUMENT')).toBeNull()
    expect(detectClientCommand('/fim', 'OTHER')).toBeNull()
  })
})
