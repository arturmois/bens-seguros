import { inject, injectable } from 'tsyringe'
import type { ContactSource } from '../domain/contact.js'
import type {
  ContactRepository,
  ContactStage,
  Page,
  ContactWithStage,
  ContactSortField,
} from '../domain/contact-repository.js'

export interface ListContactsInput {
  organizationId: string
  stage?: ContactStage
  source?: ContactSource
  salespersonId?: string
  search?: string
  cursor?: string
  limit: number
  sortBy?: ContactSortField
  sortOrder?: 'asc' | 'desc'
}

@injectable()
export class ListContacts {
  constructor(
    @inject('ContactRepository') private readonly repo: ContactRepository
  ) {}

  async execute(input: ListContactsInput): Promise<Page<ContactWithStage>> {
    return this.repo.findMany(
      {
        organizationId: input.organizationId,
        stage: input.stage,
        source: input.source,
        salespersonId: input.salespersonId,
        search: input.search,
      },
      {
        cursor: input.cursor,
        limit: input.limit,
        sortBy: input.sortBy ?? 'createdAt',
        sortOrder: input.sortOrder ?? 'desc',
      }
    )
  }
}
