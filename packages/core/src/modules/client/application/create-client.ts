import { inject, injectable } from 'tsyringe'
import { hashDocument } from '@repo/shared'
import { ClientErrors } from '../domain/client-errors.js'
import type {
  ClientData,
  ClientRepository,
  MaritalStatus,
  PersonType,
} from '../domain/client-repository.js'

export interface CreateClientInput {
  organizationId: string
  legalName: string
  document: string
  personType?: PersonType
  profession?: string | null
  maritalStatus?: MaritalStatus | null
  address?: Record<string, unknown> | null
  fiscalBirthDate?: Date | null
}

@injectable()
export class CreateClient {
  constructor(
    @inject('ClientRepository')
    private readonly clientRepo: ClientRepository
  ) {}

  async execute(input: CreateClientInput): Promise<ClientData> {
    const documentHash = hashDocument(input.document)
    const existing = await this.clientRepo.findByDocumentHash(
      documentHash,
      input.organizationId
    )
    if (existing) throw ClientErrors.alreadyExists()

    return this.clientRepo.save({
      organizationId: input.organizationId,
      legalName: input.legalName,
      document: input.document,
      personType: input.personType ?? 'INDIVIDUAL',
      profession: input.profession ?? null,
      maritalStatus: input.maritalStatus ?? null,
      address: input.address ?? null,
      fiscalBirthDate: input.fiscalBirthDate ?? null,
    })
  }
}
