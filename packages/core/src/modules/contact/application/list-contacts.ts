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
  stageIn?: readonly ContactStage[]
  sourceIn?: readonly ContactSource[]
  salespersonIdIn?: readonly string[]
  consentLgpd?: boolean
  createdFrom?: Date
  createdTo?: Date
  search?: string
  clientId?: string
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
        stageIn: input.stageIn,
        sourceIn: input.sourceIn,
        salespersonIdIn: input.salespersonIdIn,
        consentLgpd: input.consentLgpd,
        createdFrom: input.createdFrom,
        createdTo: input.createdTo,
        search: input.search,
        clientId: input.clientId,
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
