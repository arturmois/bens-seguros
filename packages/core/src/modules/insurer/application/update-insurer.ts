import { injectable, inject } from 'tsyringe'
import type {
  InsurerData,
  InsurerRepository,
  UpdateInsurerInput,
} from '../domain/insurer-repository.js'
import { InsurerErrors } from '../domain/insurer-errors.js'

@injectable()
export class UpdateInsurer {
  constructor(
    @inject('InsurerRepository') private readonly insurerRepo: InsurerRepository
  ) {}

  async execute(dto: UpdateInsurerInput): Promise<InsurerData> {
    const current = await this.insurerRepo.findById(dto.id, dto.organizationId)
    if (!current) {
      throw InsurerErrors.notFound(dto.id)
    }

    const duplicate = await this.insurerRepo.findByName(
      dto.name,
      dto.organizationId
    )
    if (duplicate && duplicate.id !== dto.id) {
      throw InsurerErrors.alreadyExists(dto.name)
    }

    return this.insurerRepo.update(dto)
  }
}
