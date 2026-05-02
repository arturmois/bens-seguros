import { inject, injectable } from 'tsyringe'
import { ClientErrors } from '../domain/client-errors.js'
import type {
  ClientData,
  ClientRepository,
  MaritalStatus,
  PersonType,
} from '../domain/client-repository.js'

export interface UpdateClientInput {
  id: string
  organizationId: string
  legalName?: string
  personType?: PersonType
  profession?: string | null
  maritalStatus?: MaritalStatus | null
  address?: Record<string, unknown> | null
  fiscalBirthDate?: Date | null
}

@injectable()
export class UpdateClient {
  constructor(
    @inject('ClientRepository') private readonly clientRepo: ClientRepository
  ) {}

  async execute(input: UpdateClientInput): Promise<ClientData> {
    const found = await this.clientRepo.findById(input.id, input.organizationId)
    if (!found) {
      throw ClientErrors.notFound(input.id)
    }
    return this.clientRepo.update(input.id, input.organizationId, {
      legalName: input.legalName,
      personType: input.personType,
      profession: input.profession,
      maritalStatus: input.maritalStatus,
      address: input.address,
      fiscalBirthDate: input.fiscalBirthDate,
    })
  }
}
