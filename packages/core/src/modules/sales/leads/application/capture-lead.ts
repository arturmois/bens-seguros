import type { CreateContact } from './create-contact.js'
import type { CreateProposal } from '../../proposals/application/create-proposal.js'
import type { ContactSource } from '../domain/contact.js'
import type { ContactRepository } from '../domain/contact-repository.js'
import type { MemberRepository } from '../../../workspace/members/domain/member-repository.js'

type Branch =
  | 'AUTO'
  | 'RESIDENTIAL'
  | 'CONDOMINIUM'
  | 'BUSINESS'
  | 'LIFE'
  | 'OTHER'

const INSURANCE_TYPE_TO_BRANCH: Record<string, Branch> = {
  AUTO: 'AUTO',
  LIFE: 'LIFE',
  RESIDENTIAL: 'RESIDENTIAL',
  BUSINESS: 'BUSINESS',
  CONDOMINIUM: 'CONDOMINIUM',
  TRAVEL: 'OTHER',
  OTHER: 'OTHER',
}

export class NoMemberError extends Error {
  readonly code = 'NO_MEMBER' as const
  constructor() {
    super('No active member in org')
    this.name = 'NoMemberError'
  }
}

export interface CaptureLeadInput {
  organizationId: string
  clientName: string
  clientPhone: string
  insuranceType: string
  notes?: string
  source?: ContactSource
}

export interface CaptureLeadResult {
  proposalId: string
  contactId: string
  message: string
}

export class CaptureLead {
  constructor(
    private readonly contactRepo: Pick<ContactRepository, 'findByPhone'>,
    private readonly memberRepo: Pick<MemberRepository, 'findOldestActive'>,
    private readonly createContact: CreateContact,
    private readonly createProposal: CreateProposal
  ) {}

  async execute(input: CaptureLeadInput): Promise<CaptureLeadResult> {
    const member = await this.memberRepo.findOldestActive(input.organizationId)
    if (!member) {
      throw new NoMemberError()
    }
    const existing = await this.contactRepo.findByPhone(
      input.clientPhone,
      input.organizationId
    )
    const contact = existing
      ? { id: existing.id, name: existing.name }
      : await this.createContact.execute({
          organizationId: input.organizationId,
          name: input.clientName,
          phone: input.clientPhone,
          source: input.source ?? 'MANUAL',
          salespersonId: member.userId,
          consentLgpd: true,
        })
    const branch = INSURANCE_TYPE_TO_BRANCH[input.insuranceType] ?? 'OTHER'
    const proposal = await this.createProposal.execute({
      organizationId: input.organizationId,
      contactId: contact.id,
      salespersonId: member.userId,
      branch,
      boardType: 'NEW_INSURANCE',
    })
    return {
      proposalId: proposal.id,
      contactId: contact.id,
      message: `Lead registrado: ${contact.name} - ${input.insuranceType}`,
    }
  }
}
