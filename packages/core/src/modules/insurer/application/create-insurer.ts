import { injectable, inject } from 'tsyringe'
import type {
  InsurerRepository,
  InsurerData,
  CreateInsurerInput,
} from '../domain/insurer-repository.js'
import { InsurerErrors } from '../domain/insurer-errors.js'

@injectable()
export class CreateInsurer {
  constructor(
    @inject('InsurerRepository') private readonly insurerRepo: InsurerRepository
  ) {}

  async execute(dto: CreateInsurerInput): Promise<InsurerData> {
    const existing = await this.insurerRepo.findByName(
      dto.name,
      dto.organizationId
    )
    if (existing) {
      throw InsurerErrors.alreadyExists(dto.name)
    }

    return this.insurerRepo.create(dto)
  }
}
