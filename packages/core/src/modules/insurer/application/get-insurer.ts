import { inject, injectable } from 'tsyringe'
import { InsurerErrors } from '../domain/insurer-errors.js'
import type {
  InsurerData,
  InsurerRepository,
} from '../domain/insurer-repository.js'

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
