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
type BoardType = 'NEW_INSURANCE' | 'RENEWAL' | 'ENDORSEMENT'

export interface SourcePolicySnapshot {
  policyNumber: string
  clientName: string
  startDate: Date
  endDate: Date
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  insurerId: string | null
  insurerName: string | null
}

function isActiveStage(stage: Stage): stage is ActiveStage {
  return stage !== 'LOST'
}

function getInitialStage(boardType: BoardType): Stage {
  return boardType === 'ENDORSEMENT' ? 'QUOTE' : 'CAPTURE'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidSnapshotStatus(
  value: unknown
): value is SourcePolicySnapshot['status'] {
  return value === 'ACTIVE' || value === 'CANCELLED' || value === 'EXPIRED'
}

function parseSnapshotDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function parseSourcePolicySnapshot(
  value: unknown
): SourcePolicySnapshot | null {
  if (!isRecord(value)) {
    return null
  }

  const startDate = parseSnapshotDate(value.startDate)
  const endDate = parseSnapshotDate(value.endDate)

  if (
    typeof value.policyNumber !== 'string' ||
    typeof value.clientName !== 'string' ||
    startDate === null ||
    endDate === null ||
    !isValidSnapshotStatus(value.status) ||
    (value.insurerId !== null && typeof value.insurerId !== 'string') ||
    (value.insurerName !== null && typeof value.insurerName !== 'string')
  ) {
    return null
  }

  return {
    policyNumber: value.policyNumber,
    clientName: value.clientName,
    startDate,
    endDate,
    status: value.status,
    insurerId: value.insurerId,
    insurerName: value.insurerName,
  }
}

export function isSourcePolicySnapshot(
  value: unknown
): value is SourcePolicySnapshot {
  return parseSourcePolicySnapshot(value) !== null
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
  sourcePolicyId: string | null
  endorsementType: string | null
  endorsementReason: string | null
  sourcePolicySnapshot: SourcePolicySnapshot | null
  insurerId: string | null
  deletedAt: Date | null
  readonly createdAt: Date
  updatedAt: Date
  clientName?: string
  clientDocument?: string
  salespersonName?: string
  insurerName?: string
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
  sourcePolicyId?: string
  endorsementType?: string
  endorsementReason?: string
  sourcePolicySnapshot?: SourcePolicySnapshot
  insurerId?: string | null
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
      stage: getInitialStage(input.boardType),
      boardType: input.boardType,
      branch: input.branch,
      premiumValueInCents: input.premiumValueInCents ?? 0,
      commissionPercentageInCents: input.commissionPercentageInCents ?? 0,
      details: null,
      lostReason: null,
      renewalPolicyId: input.renewalPolicyId ?? null,
      sourcePolicyId: input.sourcePolicyId ?? null,
      endorsementType: input.endorsementType ?? null,
      endorsementReason: input.endorsementReason ?? null,
      sourcePolicySnapshot: input.sourcePolicySnapshot ?? null,
      insurerId: input.insurerId ?? null,
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
    commissionBasisPoints: number,
    insurerId?: string | null
  ): void {
    if (details.branch !== this.props.branch) {
      throw ProposalErrors.branchMismatch(this.props.branch, details.branch)
    }
    this.props.details = details
    this.props.premiumValueInCents = premiumValueInCents
    this.props.commissionPercentageInCents = commissionBasisPoints
    if (insurerId !== undefined) {
      this.props.insurerId = insurerId
    }
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

  reopenFromLost(): void {
    if (this.props.stage !== 'LOST') {
      throw new InvalidStageTransitionError(this.props.stage, 'reabrir')
    }
    this.props.stage = getInitialStage(this.props.boardType)
    this.props.lostReason = null
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
  get sourcePolicyId(): string | null {
    return this.props.sourcePolicyId
  }
  get endorsementType(): string | null {
    return this.props.endorsementType
  }
  get endorsementReason(): string | null {
    return this.props.endorsementReason
  }
  get sourcePolicySnapshot(): SourcePolicySnapshot | null {
    return this.props.sourcePolicySnapshot
  }
  get insurerId(): string | null {
    return this.props.insurerId
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }
  get clientName(): string | undefined {
    return this.props.clientName
  }
  get clientDocument(): string | undefined {
    return this.props.clientDocument
  }
  get salespersonName(): string | undefined {
    return this.props.salespersonName
  }
  get insurerName(): string | undefined {
    return this.props.insurerName
  }

  toJSON(): ProposalProps {
    return { ...this.props }
  }
}
