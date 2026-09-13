import { inject, injectable } from 'tsyringe'
import type {
  MemberRepository,
  OrganizationMembership,
} from '../domain/member-repository.js'

@injectable()
export class ListUserTenants {
  constructor(
    @inject('MemberRepository') private readonly memberRepo: MemberRepository
  ) {}

  async execute(userId: string): Promise<OrganizationMembership[]> {
    return this.memberRepo.listOrganizationsForUser(userId)
  }
}
