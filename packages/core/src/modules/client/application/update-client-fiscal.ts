import {
  encrypt,
  getEncryptionKey,
  hashDocument,
  stripNonDigits,
} from '@repo/shared'
import type {
  ClientRepository,
  MaritalStatus,
  UpdateClientPersistence,
} from '../domain/client-repository.js'

const CPF_LENGTH = 11
const CNPJ_LENGTH = 14

export class ClientNotFoundFiscalError extends Error {
  readonly code = 'CLIENT_NOT_FOUND' as const
  constructor() {
    super('Client not found')
    this.name = 'ClientNotFoundFiscalError'
  }
}

export class InvalidDocumentError extends Error {
  readonly code = 'INVALID_DOCUMENT' as const
  constructor() {
    super('Document must be a valid CPF (11 digits) or CNPJ (14 digits)')
    this.name = 'InvalidDocumentError'
  }
}

export interface UpdateClientFiscalInput {
  id: string
  organizationId: string
  document?: string
  email?: string
  address?: {
    zipCode?: string
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
  }
  birthDate?: string
  profession?: string
  maritalStatus?: MaritalStatus
}

export class UpdateClientFiscal {
  constructor(private readonly clientRepo: ClientRepository) {}

  async execute(input: UpdateClientFiscalInput): Promise<void> {
    const existing = await this.clientRepo.findById(
      input.id,
      input.organizationId
    )
    if (!existing) {
      throw new ClientNotFoundFiscalError()
    }
    const data: UpdateClientPersistence = {}
    if (input.document !== undefined) {
      const digits = stripNonDigits(input.document)
      if (digits.length !== CPF_LENGTH && digits.length !== CNPJ_LENGTH) {
        throw new InvalidDocumentError()
      }
      const encrypted = encrypt(digits, getEncryptionKey())
      data.document = digits
      data.documentHash = hashDocument(digits)
      data.documentEncrypted = JSON.stringify(encrypted)
    }
    if (input.address !== undefined) {
      data.address = input.address
    }
    if (input.birthDate !== undefined) {
      data.fiscalBirthDate = new Date(input.birthDate)
    }
    if (input.profession !== undefined) {
      data.profession = input.profession
    }
    if (input.maritalStatus !== undefined) {
      data.maritalStatus = input.maritalStatus
    }
    if (Object.keys(data).length === 0) {
      return
    }
    await this.clientRepo.update(input.id, input.organizationId, data)
  }
}
