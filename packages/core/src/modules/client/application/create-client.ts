import { inject, injectable } from 'tsyringe'
import { hashDocument } from '@repo/shared'
import { ClientErrors } from '../domain/client-errors.js'
import type {
  ClientRepository,
  ClientWithMetrics,
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

  async execute(input: CreateClientInput): Promise<ClientWithMetrics> {
    const documentHash = hashDocument(input.document)
    const existing = await this.clientRepo.findByDocumentHash(
      documentHash,
      input.organizationId
    )
    if (existing) throw ClientErrors.alreadyExists()
    const saved = await this.clientRepo.save({
      organizationId: input.organizationId,
      legalName: input.legalName,
      document: input.document,
      personType: input.personType ?? 'INDIVIDUAL',
      profession: input.profession ?? null,
      maritalStatus: input.maritalStatus ?? null,
      address: input.address ?? null,
      fiscalBirthDate: input.fiscalBirthDate ?? null,
    })
    return {
      ...saved,
      activePolicyCount: 0,
      totalPolicyCount: 0,
      contactCount: 0,
    }
  }
}
