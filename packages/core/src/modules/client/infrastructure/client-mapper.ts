import type { Client as PrismaClientRecord } from '@repo/db'
import {
  decrypt,
  encrypt,
  getEncryptionKey,
  hashDocument,
  maskDocument,
} from '@repo/shared'
import type { EncryptedField } from '@repo/shared'
import pino from 'pino'
import type {
  ClientData,
  ClientWithMetrics,
} from '../domain/client-repository.js'

const logger = pino({ name: 'client-mapper' })

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isEncryptedField(value: unknown): value is EncryptedField {
  if (value === null || typeof value !== 'object') {
    return false
  }
  return 'ciphertext' in value && 'iv' in value && 'tag' in value
}

interface DocumentPersistence {
  readonly document: string
  readonly documentEncrypted: string
  readonly documentHash: string
}

export class ClientMapper {
  static documentToPersistence(rawDocument: string): DocumentPersistence {
    const cleaned = rawDocument.replace(/\D/g, '')
    const key = getEncryptionKey()
    const encrypted = encrypt(cleaned, key)
    return {
      document: maskDocument(cleaned),
      documentEncrypted: JSON.stringify(encrypted),
      documentHash: hashDocument(cleaned),
    }
  }

  static toDomain(row: PrismaClientRecord): ClientData {
    let document = row.document

    if (row.documentEncrypted && row.documentEncrypted.length > 0) {
      try {
        const parsed: unknown = JSON.parse(row.documentEncrypted)
        if (isEncryptedField(parsed)) {
          const key = getEncryptionKey()
          document = decrypt(parsed, key)
        }
      } catch (error) {
        logger.error(
          { clientId: row.id, error },
          'Failed to decrypt client document, returning masked value'
        )
      }
    }

    return {
      id: row.id,
      organizationId: row.organizationId,
      legalName: row.legalName,
      document,
      documentHash: row.documentHash,
      personType: row.personType,
      profession: row.profession,
      maritalStatus: row.maritalStatus,
      address: isJsonObject(row.address) ? row.address : null,
      fiscalBirthDate: row.fiscalBirthDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    }
  }

  static toWithMetrics(
    row: PrismaClientRecord,
    activePolicyCount: number,
    totalPolicyCount: number,
    contactCount: number
  ): ClientWithMetrics {
    return {
      ...ClientMapper.toDomain(row),
      activePolicyCount,
      totalPolicyCount,
      contactCount,
    }
  }
}
