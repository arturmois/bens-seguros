import { inject, injectable } from 'tsyringe'
import type { ContactRepository } from '../domain/contact-repository.js'

@injectable()
export class SoftDeleteContact {
  constructor(
    @inject('ContactRepository') private readonly repo: ContactRepository
  ) {}

  async execute(input: { id: string; organizationId: string }): Promise<void> {
    await this.repo.softDelete(input.id, input.organizationId)
  }
}
