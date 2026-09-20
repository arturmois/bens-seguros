import { injectable, inject } from 'tsyringe'
import type {
  OccurrenceRepository,
  OccurrenceData,
} from '../domain/occurrence-repository.js'

@injectable()
export class ListOccurrences {
  constructor(
    @inject('OccurrenceRepository')
    private readonly occurrenceRepo: OccurrenceRepository
  ) {}

  async execute(
    claimId: string,
    organizationId: string
  ): Promise<OccurrenceData[]> {
    return this.occurrenceRepo.findByClaimId(claimId, organizationId)
  }
}
