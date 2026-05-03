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
  // Singulares (deprecated)
  stage?: ContactStage
  source?: ContactSource
  salespersonId?: string
  // Plurais
  stageIn?: readonly ContactStage[]
  sourceIn?: readonly ContactSource[]
  salespersonIdIn?: readonly string[]
  // Boolean
  consentLgpd?: boolean
  // Date range
  createdFrom?: Date
  createdTo?: Date
  // Existentes
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
        stageIn: input.stageIn,
        sourceIn: input.sourceIn,
        salespersonIdIn: input.salespersonIdIn,
        consentLgpd: input.consentLgpd,
        createdFrom: input.createdFrom,
        createdTo: input.createdTo,
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
