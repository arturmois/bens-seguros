import type { Proposal as PrismaProposalRecord } from '@repo/db';
import { Prisma } from '@repo/db';
import { Proposal } from '../domain/proposal.js';
import type { ProposalProps } from '../domain/proposal.js';
import { isInsuredObjectDetails } from '../domain/insured-object-details.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

export class ProposalMapper {
  static toDomain(row: PrismaProposalRecord): Proposal {
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
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(proposal: Proposal): Omit<ProposalProps, 'deletedAt' | 'details'> & {
    details: Prisma.InputJsonValue | typeof Prisma.DbNull;
  } {
    const json = proposal.toJSON();
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
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
    };
  }
}
