import type { Client as PrismaClientRecord } from '@repo/db'
import {
  encrypt,
  decrypt,
  hashDocument,
  maskDocument,
  getEncryptionKey,
} from '@repo/shared'
import type { EncryptedField } from '@repo/shared'
import type {
  ClientData,
  ClientAddress,
  ClientSocialMedia,
} from '../domain/client-repository.js'
import pino from 'pino'

const logger = pino({ name: 'client-mapper' })

function isAddressObject(value: unknown): value is ClientAddress {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isSocialMediaObject(value: unknown): value is ClientSocialMedia {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isEncryptedField(value: unknown): value is EncryptedField {
  if (value === null || typeof value !== 'object') {
    return false
  }
  return 'ciphertext' in value && 'iv' in value && 'tag' in value
}

interface PersistenceData {
  readonly document: string
  readonly documentEncrypted: string
  readonly documentHash: string
}

export class ClientMapper {
  static toPersistence(rawDocument: string): PersistenceData {
    const key = getEncryptionKey()
    const encrypted = encrypt(rawDocument, key)
    const hash = hashDocument(rawDocument)
    const masked = maskDocument(rawDocument)

    return {
      document: masked,
      documentEncrypted: JSON.stringify(encrypted),
      documentHash: hash,
    }
  }

  static toDomain(row: PrismaClientRecord): ClientData {
    let document = row.document

    // Decrypt from documentEncrypted if available
    if (row.documentEncrypted && row.documentEncrypted.length > 0) {
      try {
        const parsed: unknown = JSON.parse(row.documentEncrypted)
        if (isEncryptedField(parsed)) {
          const key = getEncryptionKey()
          document = decrypt(parsed, key)
        }
      } catch (error) {
        // Decryption failed — fall back to masked document, don't crash
        logger.error(
          { clientId: row.id, error },
          'Failed to decrypt client document, returning masked value'
        )
      }
    }

    return {
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      document,
      type: row.type,
      email: row.email,
      phone: row.phone,
      birthDate: row.birthDate,
      profession: row.profession,
      maritalStatus: row.maritalStatus,
      address: isAddressObject(row.address) ? row.address : null,
      socialMedia: isSocialMediaObject(row.socialMedia)
        ? row.socialMedia
        : null,
      tags: row.tags,
      consentLgpd: row.consentLgpd,
      salespersonId: row.salespersonId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
