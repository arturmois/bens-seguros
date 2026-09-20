import { inject, injectable } from 'tsyringe'
import { ContactErrors } from '../domain/contact-errors.js'
import type {
  ContactRepository,
  ContactWithStage,
} from '../domain/contact-repository.js'

@injectable()
export class GetContact {
  constructor(
    @inject('ContactRepository') private readonly repo: ContactRepository
  ) {}

  async execute(input: {
    id: string
    organizationId: string
  }): Promise<ContactWithStage> {
    const contact = await this.repo.findByIdWithStage(
      input.id,
      input.organizationId
    )
    if (!contact) throw ContactErrors.notFound(input.id)
    return contact
  }
}
