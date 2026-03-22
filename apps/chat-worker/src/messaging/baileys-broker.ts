import makeWASocket, {
  type WASocket,
  type ConnectionState,
  type WAMessageKey,
  type CacheStore,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from 'baileys';
import pino from 'pino';
import { Message } from '@repo/db-chat';

import { createBaileysCacheStore } from '../baileys/baileys-cache-store.js';
import {
  phoneToJid,
  buildMessageContent,
  toIncomingMessage,
  mapWAStatusUpdate,
  mapConnectionState,
  shouldReconnect,
} from '../baileys/baileys-message-utils.js';
import type { Broker, BrokerEvents, MessagePayload, MessageResult } from './broker.js';

const RECONNECT_DELAY_MS = 3_000;

export class BaileysBroker implements Broker {
  private socket: WASocket | null = null;
  private connected = false;
  private tenantId: string;
  private channelId: string;
  private events: BrokerEvents | null = null;
  private readonly logger = pino({ level: 'silent' });

  /**
   * Retry counter cache MUST live outside the socket lifecycle.
   * It tracks failed message retry counts across reconnections.
   */
  private readonly msgRetryCounterCache: CacheStore;

  constructor(tenantId: string, channelId: string) {
    this.tenantId = tenantId;
    this.channelId = channelId;
    this.msgRetryCounterCache = createBaileysCacheStore();
  }

  async connect(events: BrokerEvents): Promise<void> {
    this.events = events;

    // TEMP: file auth to debug MongoDB auth serialization
    const { state, saveCreds } = await useMultiFileAuthState(
      `./baileys-sessions/${this.channelId}`,
    );
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger),
      },
      logger: this.logger,
      msgRetryCounterCache: this.msgRetryCounterCache,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      getMessage: (key: WAMessageKey) => this.getMessageForRetry(key),
    });

    this.socket = socket;
    this.setupEventListeners(socket, events, saveCreds);
  }

  /**
   * Connect using pairing code instead of QR.
   * Returns the 8-digit code the user enters on their phone.
   */
  async connectWithPairingCode(phoneNumber: string, events: BrokerEvents): Promise<string> {
    this.events = events;

    // TEMP: file auth to debug MongoDB auth serialization
    const { state, saveCreds } = await useMultiFileAuthState(
      `./baileys-sessions/${this.channelId}`,
    );
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger),
      },
      logger: this.logger,
      msgRetryCounterCache: this.msgRetryCounterCache,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      getMessage: (key: WAMessageKey) => this.getMessageForRetry(key),
    });

    this.socket = socket;
    this.setupEventListeners(socket, events, saveCreds);

    const sanitizedPhone = phoneNumber.replace(/\D/g, '');
    const code = await socket.requestPairingCode(sanitizedPhone);

    return code;
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

  /**
   * Retrieve a stored message for Baileys retry/resend mechanism.
   * Without this, messages that need retransmission fail silently.
   */
  private async getMessageForRetry(
    key: WAMessageKey,
  ): Promise<Record<string, unknown> | undefined> {
    if (!key.id) {
      return undefined;
    }

    const msg = await Message.findOne({ externalId: key.id }).lean().exec();

    if (!msg?.metadata || typeof msg.metadata !== 'object') {
      return undefined;
    }

    // metadata stores the raw WAMessage content for retry purposes
    return msg.metadata as Record<string, unknown>;
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
      // restartRequired (515) is normal after first QR scan — must reconnect.
      // All non-loggedOut disconnects get a delayed reconnect.
      globalThis.setTimeout(() => {
        void this.connect({ ...events });
      }, RECONNECT_DELAY_MS);
      return;
    }

    if (update.connection === 'open') {
      void saveCreds();
    }
  }
}
