import makeWASocket, {
  type WASocket,
  type ConnectionState,
  makeCacheableSignalKeyStore,
} from 'baileys';
import pino from 'pino';

import { useMongoDBAuthState } from '../baileys/baileys-auth-store.js';
import {
  phoneToJid,
  buildMessageContent,
  toIncomingMessage,
  mapWAStatusUpdate,
  mapConnectionState,
  shouldReconnect,
} from '../baileys/baileys-message-utils.js';
import type { Broker, BrokerEvents, MessagePayload, MessageResult } from './broker.js';

export class BaileysBroker implements Broker {
  private socket: WASocket | null = null;
  private connected = false;
  private tenantId: string;
  private channelId: string;
  private events: BrokerEvents | null = null;
  private readonly logger = pino({ level: 'silent' });

  constructor(tenantId: string, channelId: string) {
    this.tenantId = tenantId;
    this.channelId = channelId;
  }

  async connect(events: BrokerEvents): Promise<void> {
    this.events = events;

    const { state, saveCreds } = await useMongoDBAuthState(this.tenantId, this.channelId);

    const socket = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger),
      },
      logger: this.logger,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    });

    this.socket = socket;
    this.setupEventListeners(socket, events, saveCreds);
  }

  async disconnect(): Promise<void> {
    if (!this.socket) {
      return;
    }

    this.socket.end(undefined);
    this.socket = null;
    this.connected = false;
    this.events = null;
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    if (!this.socket) {
      return { externalId: '', status: 'FAILED', errorCode: 'NOT_CONNECTED' };
    }

    const jid = phoneToJid(payload.to);

    try {
      const result = await this.socket.sendMessage(jid, buildMessageContent(payload));

      const externalId = result?.key.id ?? '';
      return { externalId, status: 'SENT' };
    } catch (err: unknown) {
      const errorCode = err instanceof Error ? err.message : 'UNKNOWN_SEND_ERROR';
      return { externalId: '', status: 'FAILED', errorCode };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private setupEventListeners(
    socket: WASocket,
    events: BrokerEvents,
    saveCreds: () => Promise<void>,
  ): void {
    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update, events, saveCreds);
    });

    socket.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') {
        return;
      }

      for (const msg of messages) {
        if (msg.key.fromMe) {
          continue;
        }

        events.onMessage(toIncomingMessage(msg));
      }
    });

    socket.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        const mapped = mapWAStatusUpdate(update);
        if (mapped) {
          events.onStatusUpdate(mapped);
        }
      }
    });
  }

  private handleConnectionUpdate(
    update: Partial<ConnectionState>,
    events: BrokerEvents,
    saveCreds: () => Promise<void>,
  ): void {
    const mapped = mapConnectionState(update);
    if (mapped) {
      this.connected = mapped.status === 'CONNECTED';
      events.onConnectionUpdate(mapped.status, mapped.qr);
    }

    if (update.connection === 'close' && shouldReconnect(update)) {
      void this.connect({ ...events });
    }

    if (update.connection === 'open') {
      void saveCreds();
    }
  }
}
