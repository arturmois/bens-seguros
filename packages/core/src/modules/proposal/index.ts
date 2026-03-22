// Domain
export { Proposal } from './domain/proposal.js'
export type {
  ProposalProps,
  Stage,
  ActiveStage,
  Branch,
  BoardType,
} from './domain/proposal.js'
export type {
  InsuredObjectDetails,
  AutoDetails,
  ResidentialDetails,
  CondominiumDetails,
  BusinessDetails,
  LifeDetails,
  OtherDetails,
} from './domain/insured-object-details.js'
export { isInsuredObjectDetails } from './domain/insured-object-details.js'
export {
  ProposalNotFoundError,
  InvalidStageTransitionError,
  ProposalDetailsRequiredError,
  BranchMismatchError,
  ChecklistIncompleteError,
  ProposalErrors,
} from './domain/proposal-errors.js'
export type {
  ProposalRepository,
  ProposalFilters,
  ProposalCursorPage,
  ProposalPage,
} from './domain/proposal-repository.js'
export type { ProposalIssuedEvent } from './domain/events/proposal-issued.js'
export type { ProposalLostEvent } from './domain/events/proposal-lost.js'
export { StaticChecklistConfig } from './domain/checklist-config.js'
export type {
  ChecklistConfigProvider,
  ChecklistItemConfig,
} from './domain/checklist-config.js'
export type {
  ChecklistRepository,
  ChecklistItemData,
  ChecklistSummary,
} from './domain/checklist-repository.js'

// Application
export { CreateProposal } from './application/create-proposal.js'
export { AdvanceProposalStage } from './application/advance-proposal-stage.js'
export { RevertProposalStage } from './application/revert-proposal-stage.js'
export { MarkProposalLost } from './application/mark-proposal-lost.js'
export { ListProposals } from './application/list-proposals.js'
export { GetProposal } from './application/get-proposal.js'
export { UpdateProposalDetails } from './application/update-proposal-details.js'
export { InitializeChecklist } from './application/initialize-checklist.js'
export { ListChecklistItems } from './application/list-checklist-items.js'
export { ToggleChecklistItem } from './application/toggle-checklist-item.js'
export { CompleteChecklistByAttachment } from './application/complete-checklist-by-attachment.js'

// Infrastructure
export { ProposalMapper } from './infrastructure/proposal-mapper.js'
export { PrismaProposalRepository } from './infrastructure/prisma-proposal-repository.js'
export { PrismaChecklistRepository } from './infrastructure/prisma-checklist-repository.js'
