import { randomUUID } from 'node:crypto';

import { ChatErrors, ConversationAlreadyAssignedError } from './errors.js';
import type { ConversationStatus } from './types.js';

interface ConversationProps {
  id: string;
  tenantId: string;
  channelId: string;
  contactId: string;
  status: ConversationStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  subject: string | null;
  lastMessageText: string | null;
  lastMessageAt: Date | null;
  whatsappPhone: string | null;
  closedAt: Date | null;
  closedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateConversationInput {
  tenantId: string;
  channelId: string;
  contactId: string;
  whatsappPhone: string | null;
  hasAi: boolean;
}

export class ConversationEntity {
  private props: ConversationProps;

  private constructor(props: ConversationProps) {
    this.props = props;
  }

  static create(input: CreateConversationInput): ConversationEntity {
    const now = new Date();
    return new ConversationEntity({
      id: randomUUID(),
      tenantId: input.tenantId,
      channelId: input.channelId,
      contactId: input.contactId,
      status: input.hasAi ? 'BOT_ACTIVE' : 'WAITING_HUMAN',
      assignedTo: null,
      assignedToName: null,
      subject: null,
      lastMessageText: null,
      lastMessageAt: null,
      whatsappPhone: input.whatsappPhone,
      closedAt: null,
      closedBy: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ConversationProps): ConversationEntity {
    return new ConversationEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get tenantId(): string {
    return this.props.tenantId;
  }
  get channelId(): string {
    return this.props.channelId;
  }
  get contactId(): string {
    return this.props.contactId;
  }
  get status(): ConversationStatus {
    return this.props.status;
  }
  get assignedTo(): string | null {
    return this.props.assignedTo;
  }
  get assignedToName(): string | null {
    return this.props.assignedToName;
  }
  get subject(): string | null {
    return this.props.subject;
  }
  get lastMessageText(): string | null {
    return this.props.lastMessageText;
  }
  get lastMessageAt(): Date | null {
    return this.props.lastMessageAt;
  }
  get whatsappPhone(): string | null {
    return this.props.whatsappPhone;
  }
  get closedAt(): Date | null {
    return this.props.closedAt;
  }
  get closedBy(): string | null {
    return this.props.closedBy;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  assign(agentId: string, agentName: string): void {
    if (this.props.status === 'HUMAN_ACTIVE') {
      throw new ConversationAlreadyAssignedError(this.props.id);
    }
    if (this.props.status !== 'WAITING_HUMAN') {
      throw ChatErrors.invalidTransition(this.props.status, 'atribuir agente');
    }
    this.props.assignedTo = agentId;
    this.props.assignedToName = agentName;
    this.props.status = 'HUMAN_ACTIVE';
    this.props.updatedAt = new Date();
  }

  transfer(agentId: string, agentName: string): void {
    if (this.props.status !== 'HUMAN_ACTIVE') {
      throw ChatErrors.invalidTransition(this.props.status, 'transferir conversa');
    }
    this.props.assignedTo = agentId;
    this.props.assignedToName = agentName;
    this.props.updatedAt = new Date();
  }

  returnToQueue(): void {
    if (this.props.status !== 'HUMAN_ACTIVE') {
      throw ChatErrors.invalidTransition(this.props.status, 'devolver para fila');
    }
    this.props.assignedTo = null;
    this.props.assignedToName = null;
    this.props.status = 'WAITING_HUMAN';
    this.props.updatedAt = new Date();
  }

  close(closedBy: string): void {
    if (this.props.status === 'CLOSED') {
      throw ChatErrors.invalidTransition(this.props.status, 'fechar conversa');
    }
    this.props.status = 'CLOSED';
    this.props.closedAt = new Date();
    this.props.closedBy = closedBy;
    this.props.updatedAt = new Date();
  }

  escalateToHuman(): void {
    if (this.props.status !== 'BOT_ACTIVE') {
      throw ChatErrors.invalidTransition(this.props.status, 'escalar para humano');
    }
    this.props.status = 'WAITING_HUMAN';
    this.props.updatedAt = new Date();
  }

  toJSON(): ConversationProps {
    return { ...this.props };
  }
}
