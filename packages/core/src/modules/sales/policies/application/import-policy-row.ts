import { hashDocument } from '@repo/shared'

import { reaisToCents } from '../../../../shared-kernel/money.js'

const POLICY_BRANCHES = [
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
] as const

const POLICY_STATUSES = ['ACTIVE', 'CANCELLED', 'EXPIRED'] as const

type PolicyBranch = (typeof POLICY_BRANCHES)[number]
type PolicyStatus = (typeof POLICY_STATUSES)[number]

function isPolicyBranch(value: string): value is PolicyBranch {
  return (POLICY_BRANCHES as readonly string[]).includes(value)
}

function isPolicyStatus(value: string): value is PolicyStatus {
  return (POLICY_STATUSES as readonly string[]).includes(value)
}

export type ImportPolicyRowResult =
  | { status: 'created' }
  | { status: 'skipped' }
  | { status: 'failed'; message: string }

export interface ImportPolicyRowInput {
  organizationId: string
  userId: string
  raw: Record<string, unknown>
}

export interface ImportedIssuedProposal {
  id: string
}

export interface ImportPolicyStores {
  findByDocumentHash: (
    documentHash: string,
    organizationId: string
  ) => Promise<{ id: string } | null>
  findOldestByClientId: (
    clientId: string,
    organizationId: string
  ) => Promise<{ id: string } | null>
  findByPolicyNumber: (
    policyNumber: string,
    organizationId: string
  ) => Promise<{ id: string } | null>
  createImportedIssued: (input: {
    organizationId: string
    contactId: string
    salespersonId: string
    branch: PolicyBranch
    premiumValueInCents: number
    stage: 'POLICY_ISSUED'
    boardType: 'NEW_INSURANCE'
    commissionPercentageInCents: 0
  }) => Promise<ImportedIssuedProposal>
  createImportedPolicy: (input: {
    organizationId: string
    proposalId: string
    clientId: string
    salespersonId: string
    policyNumber: string
    status: PolicyStatus
    branch: PolicyBranch
    premiumValueInCents: number
    startDate: Date
    endDate: Date
  }) => Promise<void>
}

export class ImportPolicyRow {
  constructor(private readonly stores: ImportPolicyStores) {}

  async execute(input: ImportPolicyRowInput): Promise<ImportPolicyRowResult> {
    const numeroApolice = String(input.raw['Numero Apolice'] ?? '')
    const cpfCnpjCliente = String(input.raw['CPF/CNPJ Cliente'] ?? '')
    const ramoRaw = String(input.raw['Ramo'] ?? 'OTHER')
    const ramo = isPolicyBranch(ramoRaw) ? ramoRaw : 'OTHER'
    const premioReais = Number(input.raw['Premio (R$)'] ?? 0)
    const inicioVigencia = new Date(String(input.raw['Inicio Vigencia'] ?? ''))
    const fimVigencia = new Date(String(input.raw['Fim Vigencia'] ?? ''))
    const statusRaw = String(input.raw['Status'] ?? 'ACTIVE')
    const status = isPolicyStatus(statusRaw) ? statusRaw : 'ACTIVE'
    try {
      const client = await this.stores.findByDocumentHash(
        hashDocument(cpfCnpjCliente),
        input.organizationId
      )
      if (!client) {
        return {
          status: 'failed',
          message: `Cliente com CPF/CNPJ ${cpfCnpjCliente} não encontrado`,
        }
      }
      const existing = await this.stores.findByPolicyNumber(
        numeroApolice,
        input.organizationId
      )
      if (existing) {
        return { status: 'skipped' }
      }
      const contact = await this.stores.findOldestByClientId(
        client.id,
        input.organizationId
      )
      if (!contact) {
        return {
          status: 'failed',
          message: `Cliente com CPF/CNPJ ${cpfCnpjCliente} não tem Contact vinculado`,
        }
      }
      const premiumInCents = reaisToCents(premioReais)
      const proposal = await this.stores.createImportedIssued({
        organizationId: input.organizationId,
        contactId: contact.id,
        salespersonId: input.userId,
        branch: ramo,
        premiumValueInCents: premiumInCents,
        stage: 'POLICY_ISSUED',
        boardType: 'NEW_INSURANCE',
        commissionPercentageInCents: 0,
      })
      await this.stores.createImportedPolicy({
        organizationId: input.organizationId,
        proposalId: proposal.id,
        clientId: client.id,
        salespersonId: input.userId,
        policyNumber: numeroApolice,
        status,
        branch: ramo,
        premiumValueInCents: premiumInCents,
        startDate: inicioVigencia,
        endDate: fimVigencia,
      })
      return { status: 'created' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      return { status: 'failed', message }
    }
  }
}
