import {
  type EncryptedField,
  decrypt,
  encrypt,
  getEncryptionKey,
} from './crypto.js'

export type { EncryptedField }

export function encryptToken(plainToken: string): EncryptedField {
  return encrypt(plainToken, getEncryptionKey())
}

export function decryptToken(encrypted: EncryptedField): string {
  return decrypt(encrypted, getEncryptionKey())
}

export function isEncryptedField(value: unknown): value is EncryptedField {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj['ciphertext'] === 'string' &&
    typeof obj['iv'] === 'string' &&
    typeof obj['tag'] === 'string'
  )
}
