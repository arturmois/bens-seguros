import { inject, injectable } from 'tsyringe'
import type {
  InvitationListPage,
  InvitationRepository,
} from '../domain/invitation-repository.js'

interface ListPendingInvitationsInput {
  organizationId: string
  limit: number
  cursor?: string
}

@injectable()
export class ListPendingInvitations {
  constructor(
    @inject('InvitationRepository')
    private readonly invitationRepo: InvitationRepository
  ) {}

  async execute(
    input: ListPendingInvitationsInput
  ): Promise<InvitationListPage> {
    return this.invitationRepo.listPending(input.organizationId, {
      limit: input.limit,
      cursor: input.cursor,
    })
  }
}
