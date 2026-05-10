import { describe, expect, it } from 'vitest'

import { decryptToken, encryptToken, isEncryptedField } from './meta-crypto.js'

describe('meta-crypto', () => {
  const sampleToken = 'EAABsbCS1iZAIBAJtZAQZB7example_token_here'
  it('encrypts and decrypts a token round-trip', () => {
    const encrypted = encryptToken(sampleToken)
    expect(encrypted).toHaveProperty('ciphertext')
    expect(encrypted).toHaveProperty('iv')
    expect(encrypted).toHaveProperty('tag')
    expect(encrypted.ciphertext).not.toBe(sampleToken)
    const decrypted = decryptToken(encrypted)
    expect(decrypted).toBe(sampleToken)
  })
  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const a = encryptToken(sampleToken)
    const b = encryptToken(sampleToken)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
  })
  it('isEncryptedField returns true for valid encrypted field', () => {
    const encrypted = encryptToken(sampleToken)
    expect(isEncryptedField(encrypted)).toBe(true)
  })
  it('isEncryptedField returns false for plain string', () => {
    expect(isEncryptedField(sampleToken)).toBe(false)
    expect(isEncryptedField(null)).toBe(false)
    expect(isEncryptedField(undefined)).toBe(false)
    expect(isEncryptedField({ ciphertext: 'a' })).toBe(false)
  })
})
