export { StaticChecklistConfig } from './domain/checklist-config.js'
export type {
  ChecklistConfigProvider,
  ChecklistItemConfig,
} from './domain/checklist-config.js'
export type {
  ChecklistItemData,
  ChecklistRepository,
  ChecklistSummary,
} from './domain/checklist-repository.js'
export type { ProposalIssuedEvent } from './domain/events/proposal-issued.js'
export type { ProposalLostEvent } from './domain/events/proposal-lost.js'
export { isInsuredObjectDetails } from './domain/insured-object-details.js'
export type {
  AutoDetails,
  BusinessDetails,
  CondominiumDetails,
  InsuredObjectDetails,
  LifeDetails,
  OtherDetails,
  ResidentialDetails,
} from './domain/insured-object-details.js'
export {
  BranchMismatchError,
  CannotSendQuoteForLostProposalError,
  ChecklistIncompleteError,
  ClientHasNoEmailError,
  InvalidStageTransitionError,
  ProposalDetailsRequiredError,
  ProposalErrors,
  ProposalNotFoundError,
} from './domain/proposal-errors.js'
export type {
  ProposalCursorPage,
  ProposalFilters,
  ProposalRepository,
} from './domain/proposal-repository.js'
export type {
  ProposalListItem,
  ProposalListPage,
} from './domain/proposal-list-item.js'
export { Proposal } from './domain/proposal.js'
export type {
  ActiveStage,
  BoardType,
  Branch,
  ProposalProps,
  Stage,
} from './domain/proposal.js'

export { ExportProposalsCsv } from './application/export-proposals-csv.js'
export { AdvanceProposalStage } from './application/advance-proposal-stage.js'
export { CompleteChecklistByAttachment } from './application/complete-checklist-by-attachment.js'
export { CreateProposal } from './application/create-proposal.js'
export { GetProposal } from './application/get-proposal.js'
export { ListChecklistItems } from './application/list-checklist-items.js'
export { ListProposals } from './application/list-proposals.js'
export { MarkProposalLost } from './application/mark-proposal-lost.js'
export { ReopenProposal } from './application/reopen-proposal.js'
export { UpdateProposalDetails } from './application/update-proposal-details.js'
export { UpdateProposalDates } from './application/update-proposal-dates.js'
export { UpdateProposalObservations } from './application/update-proposal-observations.js'
export { SendQuote } from './application/send-quote.js'

export { PrismaChecklistRepository } from './infrastructure/prisma-checklist-repository.js'
export { PrismaProposalRepository } from './infrastructure/prisma-proposal-repository.js'
export { ProposalMapper } from './infrastructure/proposal-mapper.js'
