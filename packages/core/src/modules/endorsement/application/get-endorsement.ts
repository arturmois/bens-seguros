import { injectable, inject } from 'tsyringe'
import type {
  EndorsementRepository,
  EndorsementData,
} from '../domain/endorsement-repository.js'
import { EndorsementErrors } from '../domain/endorsement-errors.js'

@injectable()
export class GetEndorsement {
  constructor(
    @inject('EndorsementRepository')
    private readonly endorsementRepo: EndorsementRepository
  ) {}

  async execute(id: string, organizationId: string): Promise<EndorsementData> {
    const endorsement = await this.endorsementRepo.findById(id, organizationId)
    if (!endorsement) {
      throw EndorsementErrors.notFound(id)
    }
    return endorsement
  }
}
