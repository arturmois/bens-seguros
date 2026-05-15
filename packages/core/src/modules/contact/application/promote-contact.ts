import { hashDocument } from '@repo/shared'
import { inject, injectable } from 'tsyringe'
import type { ClientAddress } from '../../client/domain/client-address.js'
import type {
  ClientData,
  ClientRepository,
  CreateClientPersistence,
  MaritalStatus,
  PersonType,
} from '../../client/domain/client-repository.js'
import { ContactErrors } from '../domain/contact-errors.js'
import type { ContactRepository } from '../domain/contact-repository.js'

export interface PromoteContactInput {
  contactId: string
  organizationId: string
  document: string
  legalName?: string
  personType?: PersonType
  profession?: string
  maritalStatus?: MaritalStatus
  address?: ClientAddress
  fiscalBirthDate?: Date
}

@injectable()
export class PromoteContact {
  constructor(
    @inject('ContactRepository')
    private readonly contactRepo: ContactRepository,
    @inject('ClientRepository')
    private readonly clientRepo: ClientRepository
  ) {}

  async execute(input: PromoteContactInput): Promise<ClientData> {
    const contact = await this.contactRepo.findById(
      input.contactId,
      input.organizationId
    )
    if (!contact) throw ContactErrors.notFound(input.contactId)
    const incomingHash = hashDocument(input.document)
    if (contact.clientId) {
      const linkedClient = await this.clientRepo.findById(
        contact.clientId,
        input.organizationId
      )
      if (!linkedClient) {
        throw ContactErrors.invalid('Cliente vinculado não encontrado')
      }
      if (linkedClient.documentHash === incomingHash) return linkedClient
      throw ContactErrors.documentMismatch()
    }
    const existing = await this.clientRepo.findByDocumentHash(
      incomingHash,
      input.organizationId
    )
    if (existing) {
      await this.contactRepo.update(input.contactId, input.organizationId, {
        clientId: existing.id,
      })
      return existing
    }
    const legalName = input.legalName ?? contact.name
    const persistence: CreateClientPersistence = {
      organizationId: input.organizationId,
      legalName,
      document: input.document,
      personType: input.personType ?? 'INDIVIDUAL',
      profession: input.profession ?? null,
      maritalStatus: input.maritalStatus ?? null,
      address: input.address ?? null,
      fiscalBirthDate: input.fiscalBirthDate ?? null,
    }
    const created = await this.clientRepo.save(persistence)
    await this.contactRepo.update(input.contactId, input.organizationId, {
      clientId: created.id,
    })
    return created
  }
}
