import makeWASocket, {
  type WASocket,
  type ConnectionState,
  type WAMessageKey,
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
  shouldReconnect,
} from '../baileys/baileys-message-utils.js';
import type { Broker, BrokerEvents, MessagePayload, MessageResult } from './broker.js';

const RECONNECT_DELAY_MS = 3_000;

export class BaileysBroker implements Broker {
  private socket: WASocket | null = null;
  private connected = false;
  private events: BrokerEvents | null = null;
  private readonly tenantId: string;
  private readonly channelId: string;
  private readonly logger = pino({ level: 'silent' });

  /**
   * Retry counter cache lives outside the socket lifecycle
   * so it persists across reconnections.
   */
  private readonly msgRetryCounterCache = createBaileysCacheStore();

  constructor(tenantId: string, channelId: string) {
    this.tenantId = tenantId;
    this.channelId = channelId;
  }

  async connect(events: BrokerEvents): Promise<void> {
    this.events = events;
    const { socket, saveCreds } = await this.createSocket();
    this.socket = socket;
    this.setupEventListeners(socket, events, saveCreds);
  }

  async connectWithPairingCode(phoneNumber: string, events: BrokerEvents): Promise<string> {
    this.events = events;
    const { socket, saveCreds } = await this.createSocket();
    this.socket = socket;
    this.setupEventListeners(socket, events, saveCreds);

    const sanitizedPhone = phoneNumber.replace(/\D/g, '');
    return socket.requestPairingCode(sanitizedPhone);
  }

  async disconnect(): Promise<void> {
    if (!this.socket) return;
    this.socket.end(undefined);
    this.socket = null;
    this.connected = false;
    this.events = null;
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    if (!this.socket) {
      return { externalId: '', status: 'FAILED', errorCode: 'NOT_CONNECTED' };
    }

    try {
      const result = await this.socket.sendMessage(
        phoneToJid(payload.to),
        buildMessageContent(payload),
      );
      return { externalId: result?.key.id ?? '', status: 'SENT' };
    } catch (err: unknown) {
      const errorCode = err instanceof Error ? err.message : 'UNKNOWN_SEND_ERROR';
      return { externalId: '', status: 'FAILED', errorCode };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Creates the WASocket with auth state, version, and caches.
   * Shared between connect() and connectWithPairingCode().
   */
  private async createSocket(): Promise<{ socket: WASocket; saveCreds: () => Promise<void> }> {
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

    return { socket, saveCreds };
  }

  /**
   * Retrieve a stored message for Baileys retry/resend mechanism.
   */
  private async getMessageForRetry(
    key: WAMessageKey,
  ): Promise<Record<string, unknown> | undefined> {
    if (!key.id) return undefined;

    const msg = await Message.findOne({ externalId: key.id }).lean().exec();
    if (!msg?.metadata || typeof msg.metadata !== 'object') return undefined;

    return msg.metadata as Record<string, unknown>;
  }

  private setupEventListeners(
    socket: WASocket,
    events: BrokerEvents,
    saveCreds: () => Promise<void>,
  ): void {
    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update, events);
    });

    socket.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (msg.key.remoteJid?.endsWith('@g.us')) continue;

        events.onMessage(toIncomingMessage(msg));
      }
    });

    socket.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        const mapped = mapWAStatusUpdate(update);
        if (mapped) events.onStatusUpdate(mapped);
      }
    });
  }

  private handleConnectionUpdate(update: Partial<ConnectionState>, events: BrokerEvents): void {
    // Handle QR and open states normally
    if (update.qr) {
      events.onConnectionUpdate('QR_PENDING', update.qr);
      return;
    }

    if (update.connection === 'open') {
      this.connected = true;
      events.onConnectionUpdate('CONNECTED');
      return;
    }

    if (update.connection === 'close') {
      this.connected = false;

      if (shouldReconnect(update)) {
        // Transient disconnect (restartRequired 515, timeout, etc.) — reconnect silently
        globalThis.setTimeout(() => {
          void this.connect({ ...events });
        }, RECONNECT_DELAY_MS);
      } else {
        // Permanent disconnect (loggedOut) — notify frontend
        events.onConnectionUpdate('DISCONNECTED');
      }
    }
  }
}
