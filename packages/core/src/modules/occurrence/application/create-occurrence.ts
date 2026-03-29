import { injectable, inject } from 'tsyringe'
import type {
  OccurrenceRepository,
  OccurrenceData,
  CreateOccurrenceInput,
} from '../domain/occurrence-repository.js'
import type { ClaimRepository } from '../../claim/domain/claim-repository.js'
import { OccurrenceErrors } from '../domain/occurrence-errors.js'

@injectable()
export class CreateOccurrence {
  constructor(
    @inject('OccurrenceRepository')
    private readonly occurrenceRepo: OccurrenceRepository,
    @inject('ClaimRepository')
    private readonly claimRepo: ClaimRepository
  ) {}

  async execute(dto: CreateOccurrenceInput): Promise<OccurrenceData> {
    const claim = await this.claimRepo.findById(dto.claimId, dto.organizationId)
    if (!claim) {
      throw OccurrenceErrors.claimNotFound(dto.claimId)
    }
    return this.occurrenceRepo.create(dto)
  }
}
