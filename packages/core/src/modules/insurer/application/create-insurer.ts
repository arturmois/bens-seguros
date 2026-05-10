import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../shared/cache-service.js'
import { InsurerErrors } from '../domain/insurer-errors.js'
import type {
  CreateInsurerInput,
  InsurerData,
  InsurerRepository,
} from '../domain/insurer-repository.js'

@injectable()
export class CreateInsurer {
  constructor(
    @inject('InsurerRepository')
    private readonly insurerRepo: InsurerRepository,
    @inject('CacheService') private readonly cache: CacheService
  ) {}

  async execute(dto: CreateInsurerInput): Promise<InsurerData> {
    const existing = await this.insurerRepo.findByName(
      dto.name,
      dto.organizationId
    )
    if (existing) {
      throw InsurerErrors.alreadyExists(dto.name)
    }
    const created = await this.insurerRepo.create(dto)
    await this.cache.delete(`cache:${dto.organizationId}:insurers`)
    return created
  }
}
