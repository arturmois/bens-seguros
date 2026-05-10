import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../shared/cache-service.js'
import { InsurerErrors } from '../domain/insurer-errors.js'
import type {
  InsurerData,
  InsurerRepository,
  UpdateInsurerInput,
} from '../domain/insurer-repository.js'

@injectable()
export class UpdateInsurer {
  constructor(
    @inject('InsurerRepository')
    private readonly insurerRepo: InsurerRepository,
    @inject('CacheService') private readonly cache: CacheService
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
    const updated = await this.insurerRepo.update(dto)
    await this.cache.delete(`cache:${dto.organizationId}:insurers`)
    return updated
  }
}
