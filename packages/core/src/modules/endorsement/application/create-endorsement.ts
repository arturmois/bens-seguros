import { injectable, inject } from 'tsyringe'
import type {
  EndorsementRepository,
  EndorsementData,
  CreateEndorsementInput,
} from '../domain/endorsement-repository.js'

@injectable()
export class CreateEndorsement {
  constructor(
    @inject('EndorsementRepository')
    private readonly endorsementRepo: EndorsementRepository
  ) {}

  async execute(dto: CreateEndorsementInput): Promise<EndorsementData> {
    return this.endorsementRepo.create(dto)
  }
}
