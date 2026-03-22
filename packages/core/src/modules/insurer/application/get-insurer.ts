import { injectable, inject } from 'tsyringe'
import type {
  InsurerRepository,
  InsurerData,
} from '../domain/insurer-repository.js'
import { InsurerErrors } from '../domain/insurer-errors.js'

@injectable()
export class GetInsurer {
  constructor(
    @inject('InsurerRepository') private readonly insurerRepo: InsurerRepository
  ) {}

  async execute(id: string, organizationId: string): Promise<InsurerData> {
    const insurer = await this.insurerRepo.findById(id, organizationId)
    if (!insurer) {
      throw InsurerErrors.notFound(id)
    }
    return insurer
  }
}
