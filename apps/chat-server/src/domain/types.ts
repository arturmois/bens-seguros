export type ConversationStatus = 'BOT_ACTIVE' | 'WAITING_HUMAN' | 'HUMAN_ACTIVE' | 'CLOSED';

export type SenderType = 'CLIENT' | 'AGENT' | 'BOT' | 'SYSTEM';

export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'OTHER';

export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export type ChannelType = 'WHATSAPP' | 'WEB';

export type BrokerType = 'BAILEYS' | 'META';

export type ChannelStatus = 'CONNECTED' | 'DISCONNECTED' | 'QR_PENDING';

export interface ConversationData {
  readonly id: string;
  readonly tenantId: string;
  readonly channelId: string;
  readonly contactId: string;
  readonly status: ConversationStatus;
  readonly assignedTo: string | null;
  readonly assignedToName: string | null;
  readonly subject: string | null;
  readonly lastMessageText: string | null;
  readonly lastMessageAt: Date | null;
  readonly whatsappPhone: string | null;
  readonly closedAt: Date | null;
  readonly closedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface MessageData {
  readonly id: string;
  readonly conversationId: string;
  readonly tenantId: string;
  readonly senderType: SenderType;
  readonly senderName: string | null;
  readonly senderId: string | null;
  readonly text: string | null;
  readonly type: MessageType;
  readonly mediaUrl: string | null;
  readonly mediaKey: string | null;
  readonly status: MessageStatus;
  readonly metadata: Record<string, unknown> | null;
  readonly externalId: string | null;
  readonly createdAt: Date;
}

export interface ContactData {
  readonly id: string;
  readonly tenantId: string;
  readonly whatsappPhone: string;
  readonly pushName: string | null;
  readonly profilePicUrl: string | null;
  readonly clientId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ChannelData {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly type: ChannelType;
  readonly brokerType: BrokerType;
  readonly phoneNumber: string | null;
  readonly isActive: boolean;
  readonly status: ChannelStatus;
  readonly lastConnectedAt: Date | null;
  readonly aiUserId: string | null;
  readonly config: Record<string, unknown>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CursorPage {
  cursor?: string;
  limit: number;
}

export interface Page<TData> {
  data: TData[];
  meta: {
    total: number;
    nextCursor: string | null;
  };
}

export interface ConversationFilters {
  tenantId: string;
  status?: ConversationStatus;
  assignedTo?: string;
  search?: string;
}
