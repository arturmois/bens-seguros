import { randomUUID } from 'node:crypto';

const STAGES = ['CAPTURE', 'QUOTE', 'PROTOCOL', 'INSPECTION', 'PAYMENT', 'POLICY_ISSUED'] as const;

type ActiveStage = (typeof STAGES)[number];
type Stage = ActiveStage | 'LOST';
type Branch = 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER';
type BoardType = 'NEW_INSURANCE' | 'RENEWAL';

export interface ProposalProps {
  readonly id: string;
  readonly organizationId: string;
  readonly clientId: string;
  readonly salespersonId: string;
  stage: Stage;
  boardType: BoardType;
  branch: Branch;
  premiumValueInCents: number;
  commissionPercentageInCents: number;
  lostReason: string | null;
  renewalPolicyId: string | null;
  deletedAt: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface CreateProposalInput {
  organizationId: string;
  clientId: string;
  salespersonId: string;
  branch: Branch;
  boardType: BoardType;
  premiumValueInCents?: number;
  commissionPercentageInCents?: number;
  renewalPolicyId?: string;
}

export type { Stage, ActiveStage, Branch, BoardType };

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
      lostReason: null,
      renewalPolicyId: input.renewalPolicyId ?? null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static restore(props: ProposalProps): Proposal {
    return new Proposal(props);
  }

  advance(): void {
    if (this.props.stage === 'LOST') {
      throw new Error('Cannot advance from LOST stage');
    }

    const currentIndex = STAGES.indexOf(this.props.stage as ActiveStage);
    if (currentIndex === -1 || currentIndex >= STAGES.length - 1) {
      throw new Error('Cannot advance beyond POLICY_ISSUED');
    }

    const nextStage = STAGES[currentIndex + 1];
    if (!nextStage) {
      throw new Error('Cannot advance beyond POLICY_ISSUED');
    }

    this.props.stage = nextStage;
    this.props.updatedAt = new Date();
  }

  revert(): void {
    if (this.props.stage === 'LOST' || this.props.stage === 'POLICY_ISSUED') {
      throw new Error('Cannot revert from terminal stage');
    }

    const currentIndex = STAGES.indexOf(this.props.stage as ActiveStage);
    if (currentIndex <= 0) {
      throw new Error('Cannot revert from CAPTURE');
    }

    const prevStage = STAGES[currentIndex - 1];
    if (!prevStage) {
      throw new Error('Cannot revert from CAPTURE');
    }

    this.props.stage = prevStage;
    this.props.updatedAt = new Date();
  }

  markAsLost(reason: string): void {
    if (this.props.stage === 'POLICY_ISSUED' || this.props.stage === 'LOST') {
      throw new Error('Cannot mark as lost from terminal stage');
    }

    this.props.stage = 'LOST';
    this.props.lostReason = reason;
    this.props.updatedAt = new Date();
  }

  get id(): string {
    return this.props.id;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get clientId(): string {
    return this.props.clientId;
  }
  get salespersonId(): string {
    return this.props.salespersonId;
  }
  get stage(): Stage {
    return this.props.stage;
  }
  get boardType(): BoardType {
    return this.props.boardType;
  }
  get branch(): Branch {
    return this.props.branch;
  }
  get premiumValueInCents(): number {
    return this.props.premiumValueInCents;
  }
  get commissionPercentageInCents(): number {
    return this.props.commissionPercentageInCents;
  }
  get lostReason(): string | null {
    return this.props.lostReason;
  }
  get renewalPolicyId(): string | null {
    return this.props.renewalPolicyId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON(): ProposalProps {
    return { ...this.props };
  }
}
