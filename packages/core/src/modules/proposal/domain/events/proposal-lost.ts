export interface ProposalLostEvent {
  readonly type: 'PROPOSAL_LOST';
  readonly proposalId: string;
  readonly organizationId: string;
  readonly clientId: string;
  readonly reason: string;
}
