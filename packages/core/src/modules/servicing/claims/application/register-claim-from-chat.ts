import { hashDocument, stripNonDigits } from '@repo/shared'

import type { ClientRepository } from '../../../client/domain/client-repository.js'
import type { ContactRepository } from '../../../sales/leads/domain/contact-repository.js'
import type {
  PolicyData,
  PolicyRepository,
} from '../../../sales/policies/domain/policy-repository.js'
import type { CreateClaim } from './create-claim.js'

const DOCUMENT_CPF_LENGTH = 11
const DOCUMENT_CNPJ_LENGTH = 14
const ACTIVE_POLICY_LOOKUP_LIMIT = 1000

const MISSING_CLIENT_MESSAGE =
  'Cliente não encontrado. Dados registrados para o corretor.'
const MISSING_POLICY_MESSAGE =
  'Nenhuma apólice ativa encontrada. Dados registrados para o corretor.'

export interface RegisterClaimFromChatInput {
  organizationId: string
  phoneOrDocument: string
  description: string
  incidentDate?: string
  incidentLocation?: string
  insuranceType?: string
}

export interface RegisterClaimFromChatResult {
  claimCreated: boolean
  claimNumber: string | null
  dataSaved: boolean
  claimData: Record<string, unknown> | null
  message: string
}

function isDocument(value: string): boolean {
  const digits = stripNonDigits(value)
  return (
    digits.length === DOCUMENT_CPF_LENGTH ||
    digits.length === DOCUMENT_CNPJ_LENGTH
  )
}

function pickLatestEnding(policies: PolicyData[]): PolicyData | null {
  if (policies.length === 0) {
    return null
  }
  return policies.reduce((latest, current) =>
    current.endDate > latest.endDate ? current : latest
  )
}

export class RegisterClaimFromChat {
  constructor(
    private readonly clientRepo: Pick<
      ClientRepository,
      'findByDocumentHash' | 'findById'
    >,
    private readonly contactRepo: Pick<ContactRepository, 'findByPhone'>,
    private readonly policyRepo: Pick<PolicyRepository, 'listActiveForClient'>,
    private readonly createClaim: Pick<CreateClaim, 'execute'>
  ) {}

  async execute(
    input: RegisterClaimFromChatInput
  ): Promise<RegisterClaimFromChatResult> {
    const client = await this.resolveClient(
      input.organizationId,
      input.phoneOrDocument
    )
    // S9: dataSaved is true even when nothing was persisted. Relocate, do not fix.
    if (!client) {
      return {
        claimCreated: false,
        claimNumber: null,
        dataSaved: true,
        claimData: {
          phoneOrDocument: input.phoneOrDocument,
          description: input.description,
          incidentDate: input.incidentDate ?? null,
          incidentLocation: input.incidentLocation ?? null,
          insuranceType: input.insuranceType ?? null,
        },
        message: MISSING_CLIENT_MESSAGE,
      }
    }
    const policies = await this.policyRepo.listActiveForClient({
      organizationId: input.organizationId,
      clientId: client.id,
      branch: input.insuranceType,
      limit: ACTIVE_POLICY_LOOKUP_LIMIT,
    })
    const policy = pickLatestEnding(policies)
    if (!policy) {
      return {
        claimCreated: false,
        claimNumber: null,
        dataSaved: true,
        claimData: {
          clientId: client.id,
          clientName: client.legalName,
          phoneOrDocument: input.phoneOrDocument,
          description: input.description,
          incidentDate: input.incidentDate ?? null,
          incidentLocation: input.incidentLocation ?? null,
          insuranceType: input.insuranceType ?? null,
        },
        message: MISSING_POLICY_MESSAGE,
      }
    }
    const claim = await this.createClaim.execute({
      organizationId: input.organizationId,
      policyId: policy.id,
      clientId: client.id,
      insurerId: policy.insurerId ?? undefined,
      priority: 'URGENT',
      description: input.description,
      incidentDate: input.incidentDate
        ? new Date(input.incidentDate)
        : undefined,
      incidentLocation: input.incidentLocation,
    })
    return {
      claimCreated: true,
      claimNumber: `SIN-${String(claim.claimNumber)}`,
      dataSaved: false,
      claimData: null,
      message: `Sinistro ${claim.claimNumber} registrado com prioridade urgente.`,
    }
  }

  private async resolveClient(organizationId: string, phoneOrDocument: string) {
    if (isDocument(phoneOrDocument)) {
      const digits = stripNonDigits(phoneOrDocument)
      return this.clientRepo.findByDocumentHash(
        hashDocument(digits),
        organizationId
      )
    }
    const contact = await this.contactRepo.findByPhone(
      phoneOrDocument,
      organizationId
    )
    if (!contact?.clientId) {
      return null
    }
    return this.clientRepo.findById(contact.clientId, organizationId)
  }
}
