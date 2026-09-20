import type { ClientAddress } from '../domain/client-address.js'
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
  address?: ClientAddress | null
  fiscalBirthDate?: Date | null
}

export class UpdateClient {
  constructor(private readonly clientRepo: ClientRepository) {}

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
