import { injectable, inject } from 'tsyringe'
import type {
  ClaimRepository,
  ClaimData,
  CreateClaimInput,
} from '../domain/claim-repository.js'

@injectable()
export class CreateClaim {
  constructor(
    @inject('ClaimRepository') private readonly claimRepo: ClaimRepository
  ) {}

  async execute(dto: CreateClaimInput): Promise<ClaimData> {
    return this.claimRepo.create(dto)
  }
}
