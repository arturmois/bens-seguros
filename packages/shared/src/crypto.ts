import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

// Dev-only fallback key (never used in production — env validation enforces ENCRYPTION_KEY)
const DEV_FALLBACK_KEY = '0'.repeat(64)

export interface EncryptedField {
  readonly ciphertext: string
  readonly iv: string
  readonly tag: string
}

export function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY ?? DEV_FALLBACK_KEY
  return Buffer.from(keyHex, 'hex')
}

export function encrypt(plaintext: string, key: Buffer): EncryptedField {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])

  const tag = cipher.getAuthTag()

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export function decrypt(encrypted: EncryptedField, key: Buffer): string {
  const iv = Buffer.from(encrypted.iv, 'base64')
  const tag = Buffer.from(encrypted.tag, 'base64')
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  })
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function hashDocument(document: string): string {
  const digits = stripNonDigits(document)
  return createHash('sha256').update(digits).digest('hex')
}

export function maskDocument(document: string): string {
  const digits = stripNonDigits(document)

  if (digits.length === 11) {
    // CPF: ***.***.XXX-XX (last 5 visible)
    return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  if (digits.length === 14) {
    // CNPJ: **.***.***/XXXX-XX (last 6 visible)
    return `**.***.***/${digits.slice(8, 12)}-${digits.slice(12)}`
  }

  // Fallback: mask all but last 4
  const visible = digits.slice(-4)
  const masked = '*'.repeat(Math.max(0, digits.length - 4))
  return `${masked}${visible}`
}
