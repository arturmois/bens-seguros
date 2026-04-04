import type { Proposal as PrismaProposalRecord } from '@repo/db'
import { Prisma } from '@repo/db'
import { Proposal, parseSourcePolicySnapshot } from '../domain/proposal.js'
import type { ProposalProps } from '../domain/proposal.js'
import { isInsuredObjectDetails } from '../domain/insured-object-details.js'

interface ProposalRelations {
  client?: { name: string; document: string } | null
  salesperson?: { name: string } | null
  insurer?: { name: string } | null
}

type ProposalWithRelations = PrismaProposalRecord & ProposalRelations

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value))
}

export class ProposalMapper {
  static toDomain(row: ProposalWithRelations): Proposal {
    return Proposal.restore({
      id: row.id,
      organizationId: row.organizationId,
      clientId: row.clientId,
      salespersonId: row.salespersonId,
      stage: row.stage,
      boardType: row.boardType,
      branch: row.branch,
      premiumValueInCents: row.premiumValueInCents,
      commissionPercentageInCents: row.commissionPercentageInCents,
      details: isInsuredObjectDetails(row.details) ? row.details : null,
      lostReason: row.lostReason,
      renewalPolicyId: row.renewalPolicyId,
      sourcePolicyId: row.sourcePolicyId,
      endorsementType: row.endorsementType,
      endorsementReason: row.endorsementReason,
      sourcePolicySnapshot: parseSourcePolicySnapshot(row.sourcePolicySnapshot),
      insurerId: row.insurerId,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      coverageStartDate: row.coverageStartDate ?? null,
      coverageEndDate: row.coverageEndDate ?? null,
      sentToClientAt: row.sentToClientAt ?? null,
      clientResponseAt: row.clientResponseAt ?? null,
      quoteValidUntil: row.quoteValidUntil ?? null,
      clientName: row.client?.name,
      clientDocument: row.client?.document,
      salespersonName: row.salesperson?.name,
      insurerName: row.insurer?.name,
    })
  }

  static toPersistence(proposal: Proposal): Omit<
    ProposalProps,
    'deletedAt' | 'details' | 'sourcePolicySnapshot'
  > & {
    details: Prisma.InputJsonValue | typeof Prisma.DbNull
    sourcePolicySnapshot: Prisma.InputJsonValue | typeof Prisma.DbNull
  } {
    const json = proposal.toJSON()
    return {
      id: json.id,
      organizationId: json.organizationId,
      clientId: json.clientId,
      salespersonId: json.salespersonId,
      stage: json.stage,
      boardType: json.boardType,
      branch: json.branch,
      premiumValueInCents: json.premiumValueInCents,
      commissionPercentageInCents: json.commissionPercentageInCents,
      details: json.details ? toJsonValue(json.details) : Prisma.DbNull,
      lostReason: json.lostReason,
      renewalPolicyId: json.renewalPolicyId,
      sourcePolicyId: json.sourcePolicyId,
      endorsementType: json.endorsementType,
      endorsementReason: json.endorsementReason,
      sourcePolicySnapshot: json.sourcePolicySnapshot
        ? toJsonValue(json.sourcePolicySnapshot)
        : Prisma.DbNull,
      insurerId: json.insurerId,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      coverageStartDate: json.coverageStartDate,
      coverageEndDate: json.coverageEndDate,
      sentToClientAt: json.sentToClientAt,
      clientResponseAt: json.clientResponseAt,
      quoteValidUntil: json.quoteValidUntil,
    }
  }
}
