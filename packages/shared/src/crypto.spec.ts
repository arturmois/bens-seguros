import { describe, expect, it } from 'vitest'
import {
  encrypt,
  decrypt,
  hashDocument,
  maskDocument,
  getEncryptionKey,
} from './crypto.js'

describe('crypto', () => {
  const key = Buffer.from('a'.repeat(64), 'hex')

  describe('encrypt/decrypt roundtrip', () => {
    it('encrypts and decrypts a CPF', () => {
      const cpf = '12345678901'
      const encrypted = encrypt(cpf, key)
      const decrypted = decrypt(encrypted, key)

      expect(decrypted).toBe(cpf)
      expect(encrypted.ciphertext).not.toBe(cpf)
    })

    it('produces different ciphertexts for same plaintext (random IV)', () => {
      const cpf = '12345678901'
      const a = encrypt(cpf, key)
      const b = encrypt(cpf, key)

      expect(a.ciphertext).not.toBe(b.ciphertext)
      expect(a.iv).not.toBe(b.iv)
    })

    it('throws on tampered ciphertext', () => {
      const encrypted = encrypt('12345678901', key)
      const tampered = { ...encrypted, ciphertext: 'dGFtcGVyZWQ=' }

      expect(() => decrypt(tampered, key)).toThrow()
    })

    it('throws on wrong key', () => {
      const encrypted = encrypt('12345678901', key)
      const wrongKey = Buffer.from('b'.repeat(64), 'hex')

      expect(() => decrypt(encrypted, wrongKey)).toThrow()
    })
  })

  describe('hashDocument', () => {
    it('strips non-digits before hashing', () => {
      const formatted = hashDocument('123.456.789-00')
      const raw = hashDocument('12345678900')

      expect(formatted).toBe(raw)
    })

    it('returns consistent SHA-256 hex', () => {
      const hash = hashDocument('12345678901')

      expect(hash).toMatch(/^[0-9a-f]{64}$/)
      expect(hashDocument('12345678901')).toBe(hash)
    })
  })

  describe('maskDocument', () => {
    it('masks CPF correctly', () => {
      expect(maskDocument('12345678901')).toBe('***.***.789-01')
    })

    it('masks CNPJ correctly', () => {
      expect(maskDocument('12345678000195')).toBe('**.***.***/0001-95')
    })

    it('masks arbitrary length documents', () => {
      expect(maskDocument('123456')).toBe('**3456')
    })
  })

  describe('getEncryptionKey', () => {
    it('returns a 32-byte Buffer', () => {
      const result = getEncryptionKey()

      expect(Buffer.isBuffer(result)).toBe(true)
      expect(result.length).toBe(32)
    })
  })
})
