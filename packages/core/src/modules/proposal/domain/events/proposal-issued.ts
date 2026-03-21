export interface ProposalIssuedEvent {
  readonly type: 'PROPOSAL_ISSUED';
  readonly proposalId: string;
  readonly organizationId: string;
  readonly clientId: string;
  readonly salespersonId: string;
  readonly premiumValueInCents: number;
  readonly commissionPercentageInCents: number;
}
