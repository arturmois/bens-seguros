export type ConversationStatus = 'BOT_ACTIVE' | 'WAITING_HUMAN' | 'HUMAN_ACTIVE' | 'CLOSED';
export type SenderType = 'CLIENT' | 'AGENT' | 'BOT' | 'SYSTEM';
export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
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
  readonly lastMessageAt: string | null;
  readonly whatsappPhone: string | null;
  readonly closedAt: string | null;
  readonly closedBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
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
  readonly status: MessageStatus;
  readonly externalId: string | null;
  readonly createdAt: string;
}

export interface ContactData {
  readonly id: string;
  readonly tenantId: string;
  readonly whatsappPhone: string;
  readonly pushName: string | null;
  readonly profilePicUrl: string | null;
  readonly clientId: string | null;
}

export interface ChannelData {
  readonly id: string;
  readonly name: string;
  readonly type: 'WHATSAPP' | 'WEB';
  readonly brokerType: 'BAILEYS' | 'META';
  readonly phoneNumber: string | null;
  readonly isActive: boolean;
  readonly status: ChannelStatus;
}

export interface MessagePage {
  readonly data: MessageData[];
  readonly meta: ListMeta;
}

export interface ConversationWithDetails {
  readonly conversation: ConversationData;
  readonly messages: MessagePage;
  readonly contact: ContactData | null;
}

export interface AgentPresence {
  readonly userId: string;
  readonly name: string;
  readonly status: 'online' | 'offline';
}

export interface ListMeta {
  readonly total: number;
  readonly nextCursor: string | null;
}

export interface ConversationFilters {
  readonly status?: ConversationStatus;
  readonly search?: string;
  readonly assignedTo?: string;
  readonly cursor?: string;
  readonly limit?: number;
}
