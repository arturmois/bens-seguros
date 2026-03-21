// Domain
export { Proposal } from './domain/proposal.js';
export type { ProposalProps, Stage, ActiveStage, Branch, BoardType } from './domain/proposal.js';
export type {
  InsuredObjectDetails,
  AutoDetails,
  ResidentialDetails,
  CondominiumDetails,
  BusinessDetails,
  LifeDetails,
  OtherDetails,
} from './domain/insured-object-details.js';
export { isInsuredObjectDetails } from './domain/insured-object-details.js';
export {
  ProposalNotFoundError,
  InvalidStageTransitionError,
  ProposalDetailsRequiredError,
  BranchMismatchError,
  ProposalErrors,
} from './domain/proposal-errors.js';
export type {
  ProposalRepository,
  ProposalFilters,
  ProposalCursorPage,
  ProposalPage,
} from './domain/proposal-repository.js';
export type { ProposalIssuedEvent } from './domain/events/proposal-issued.js';
export type { ProposalLostEvent } from './domain/events/proposal-lost.js';

// Application
export { CreateProposal } from './application/create-proposal.js';
export { AdvanceProposalStage } from './application/advance-proposal-stage.js';
export { RevertProposalStage } from './application/revert-proposal-stage.js';
export { MarkProposalLost } from './application/mark-proposal-lost.js';
export { ListProposals } from './application/list-proposals.js';
export { GetProposal } from './application/get-proposal.js';
export { UpdateProposalDetails } from './application/update-proposal-details.js';

// Infrastructure
export { ProposalMapper } from './infrastructure/proposal-mapper.js';
export { PrismaProposalRepository } from './infrastructure/prisma-proposal-repository.js';
