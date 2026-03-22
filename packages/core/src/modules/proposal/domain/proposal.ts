import { randomUUID } from 'node:crypto'

import type { InsuredObjectDetails } from './insured-object-details.js'
import { ProposalErrors } from './proposal-errors.js'
import { InvalidStageTransitionError } from './proposal-errors.js'

const STAGES = [
  'CAPTURE',
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
  'POLICY_ISSUED',
] as const

type ActiveStage = (typeof STAGES)[number]
type Stage = ActiveStage | 'LOST'
type Branch =
  | 'AUTO'
  | 'RESIDENTIAL'
  | 'CONDOMINIUM'
  | 'BUSINESS'
  | 'LIFE'
  | 'OTHER'
type BoardType = 'NEW_INSURANCE' | 'RENEWAL'

function isActiveStage(stage: Stage): stage is ActiveStage {
  return stage !== 'LOST'
}

export interface ProposalProps {
  readonly id: string
  readonly organizationId: string
  readonly clientId: string
  readonly salespersonId: string
  stage: Stage
  boardType: BoardType
  branch: Branch
  premiumValueInCents: number
  commissionPercentageInCents: number
  details: InsuredObjectDetails | null
  lostReason: string | null
  renewalPolicyId: string | null
  deletedAt: Date | null
  readonly createdAt: Date
  updatedAt: Date
  clientName?: string
  salespersonName?: string
}

interface CreateProposalInput {
  organizationId: string
  clientId: string
  salespersonId: string
  branch: Branch
  boardType: BoardType
  premiumValueInCents?: number
  commissionPercentageInCents?: number
  renewalPolicyId?: string
}

export type { Stage, ActiveStage, Branch, BoardType }

export class Proposal {
  private constructor(private readonly props: ProposalProps) {}

  static create(input: CreateProposalInput): Proposal {
    return new Proposal({
      id: randomUUID(),
      organizationId: input.organizationId,
      clientId: input.clientId,
      salespersonId: input.salespersonId,
      stage: 'CAPTURE',
      boardType: input.boardType,
      branch: input.branch,
      premiumValueInCents: input.premiumValueInCents ?? 0,
      commissionPercentageInCents: input.commissionPercentageInCents ?? 0,
      details: null,
      lostReason: null,
      renewalPolicyId: input.renewalPolicyId ?? null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static restore(props: ProposalProps): Proposal {
    return new Proposal(props)
  }

  advance(): void {
    if (!isActiveStage(this.props.stage)) {
      throw new InvalidStageTransitionError(this.props.stage, 'avançar')
    }

    const currentIndex = STAGES.indexOf(this.props.stage)
    if (currentIndex === -1 || currentIndex >= STAGES.length - 1) {
      throw new InvalidStageTransitionError(this.props.stage, 'avançar')
    }

    const nextStage = STAGES[currentIndex + 1]
    if (!nextStage) {
      throw new InvalidStageTransitionError(this.props.stage, 'avançar')
    }

    this.props.stage = nextStage
    this.props.updatedAt = new Date()
  }

  updateDetails(
    details: InsuredObjectDetails,
    premiumValueInCents: number,
    commissionBasisPoints: number
  ): void {
    if (details.branch !== this.props.branch) {
      throw ProposalErrors.branchMismatch(this.props.branch, details.branch)
    }
    this.props.details = details
    this.props.premiumValueInCents = premiumValueInCents
    this.props.commissionPercentageInCents = commissionBasisPoints
    this.props.updatedAt = new Date()
  }

  markAsLost(reason: string): void {
    if (this.props.stage === 'POLICY_ISSUED' || this.props.stage === 'LOST') {
      throw new InvalidStageTransitionError(
        this.props.stage,
        'marcar como perda'
      )
    }

    this.props.stage = 'LOST'
    this.props.lostReason = reason
    this.props.updatedAt = new Date()
  }

  get id(): string {
    return this.props.id
  }
  get organizationId(): string {
    return this.props.organizationId
  }
  get clientId(): string {
    return this.props.clientId
  }
  get salespersonId(): string {
    return this.props.salespersonId
  }
  get stage(): Stage {
    return this.props.stage
  }
  get boardType(): BoardType {
    return this.props.boardType
  }
  get branch(): Branch {
    return this.props.branch
  }
  get details(): InsuredObjectDetails | null {
    return this.props.details
  }
  get premiumValueInCents(): number {
    return this.props.premiumValueInCents
  }
  get commissionPercentageInCents(): number {
    return this.props.commissionPercentageInCents
  }
  get lostReason(): string | null {
    return this.props.lostReason
  }
  get renewalPolicyId(): string | null {
    return this.props.renewalPolicyId
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  toJSON(): ProposalProps {
    return { ...this.props }
  }
}
