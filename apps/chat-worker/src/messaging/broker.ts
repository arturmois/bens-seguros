export interface MessagePayload {
  readonly to: string;
  readonly text?: string;
  readonly mediaUrl?: string;
  readonly type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
}

export interface MessageResult {
  readonly externalId: string;
  readonly status: 'SENT' | 'FAILED';
  readonly errorCode?: string;
}

export interface IncomingMessage {
  readonly from: string;
  readonly pushName?: string;
  readonly text?: string;
  readonly type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
  readonly mediaUrl?: string;
  readonly externalId: string;
  readonly timestamp: Date;
}

export interface StatusUpdate {
  readonly externalId: string;
  readonly status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
}

export interface BrokerEvents {
  onMessage: (msg: IncomingMessage) => void;
  onStatusUpdate: (update: StatusUpdate) => void;
  onConnectionUpdate: (status: 'CONNECTED' | 'DISCONNECTED' | 'QR_PENDING', qr?: string) => void;
}

export interface Broker {
  connect(events: BrokerEvents): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(payload: MessagePayload): Promise<MessageResult>;
  isConnected(): boolean;
}
