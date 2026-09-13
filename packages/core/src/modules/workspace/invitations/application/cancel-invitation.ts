import { inject, injectable } from 'tsyringe'
import { InvitationNotFoundError } from '../domain/invitation-errors.js'
import type {
  InvitationDetail,
  InvitationRepository,
} from '../domain/invitation-repository.js'

@injectable()
export class CancelInvitation {
  constructor(
    @inject('InvitationRepository')
    private readonly invitationRepo: InvitationRepository
  ) {}

  async execute(id: string, organizationId: string): Promise<InvitationDetail> {
    const canceled = await this.invitationRepo.cancelPending(id, organizationId)
    if (!canceled) {
      throw new InvitationNotFoundError(id)
    }
    return canceled
  }
}
