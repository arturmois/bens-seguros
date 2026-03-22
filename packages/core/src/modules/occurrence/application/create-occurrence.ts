import { injectable, inject } from 'tsyringe'
import type {
  OccurrenceRepository,
  OccurrenceData,
  CreateOccurrenceInput,
} from '../domain/occurrence-repository.js'

@injectable()
export class CreateOccurrence {
  constructor(
    @inject('OccurrenceRepository')
    private readonly occurrenceRepo: OccurrenceRepository
  ) {}

  async execute(dto: CreateOccurrenceInput): Promise<OccurrenceData> {
    return this.occurrenceRepo.create(dto)
  }
}
