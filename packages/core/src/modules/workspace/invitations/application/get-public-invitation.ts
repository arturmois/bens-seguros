import { inject, injectable } from 'tsyringe'
import { InvitationNotFoundError } from '../domain/invitation-errors.js'
import type {
  InvitationPublicView,
  InvitationRepository,
} from '../domain/invitation-repository.js'

@injectable()
export class GetPublicInvitation {
  constructor(
    @inject('InvitationRepository')
    private readonly invitationRepo: InvitationRepository
  ) {}

  async execute(id: string): Promise<InvitationPublicView> {
    const view = await this.invitationRepo.findByIdPublic(id)
    if (!view) {
      throw new InvitationNotFoundError(id)
    }
    return view
  }
}
