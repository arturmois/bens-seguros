import makeWASocket, {
  type WASocket,
  type ConnectionState,
  type WAMessageKey,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from 'baileys'
import pino from 'pino'
import { Message } from '@repo/db-chat'

import { createBaileysCacheStore } from '../baileys/baileys-cache-store.js'
import {
  phoneToJid,
  buildMessageContent,
  toIncomingMessage,
  mapWAStatusUpdate,
  shouldReconnect,
  WHATSAPP_JID_SUFFIX,
} from '../baileys/baileys-message-utils.js'
import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker.js'

const RECONNECT_DELAY_MS = 3_000

function isMessageMetadata(data: unknown): data is Record<string, unknown> {
  return data !== null && typeof data === 'object' && !Array.isArray(data)
}

export class BaileysBroker implements Broker {
  private socket: WASocket | null = null
  private connected = false
  private events: BrokerEvents | null = null
  private readonly tenantId: string
  private readonly channelId: string
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 20
  private readonly logger = pino({
    level: process.env['BAILEYS_LOG_LEVEL'] ?? 'warn',
  })

  /**
   * Retry counter cache lives outside the socket lifecycle
   * so it persists across reconnections.
   */
  private readonly msgRetryCounterCache = createBaileysCacheStore()

  constructor(tenantId: string, channelId: string) {
    this.tenantId = tenantId
    this.channelId = channelId
  }

  async connect(events: BrokerEvents): Promise<void> {
    this.events = events
    const { socket, saveCreds } = await this.createSocket()
    this.socket = socket
    this.setupEventListeners(socket, events, saveCreds)
  }

  async connectWithPairingCode(
    phoneNumber: string,
    events: BrokerEvents
  ): Promise<string> {
    this.events = events
    const { socket, saveCreds } = await this.createSocket()
    this.socket = socket
    this.setupEventListeners(socket, events, saveCreds)

    const sanitizedPhone = phoneNumber.replace(/\D/g, '')
    return socket.requestPairingCode(sanitizedPhone)
  }

  async disconnect(): Promise<void> {
    if (!this.socket) return
    this.socket.ev.removeAllListeners('creds.update')
    this.socket.ev.removeAllListeners('connection.update')
    this.socket.ev.removeAllListeners('messages.upsert')
    this.socket.ev.removeAllListeners('messages.update')
    this.socket.end(undefined)
    this.socket = null
    this.connected = false
    this.reconnectAttempts = 0
    this.events = null
  }

  async sendMessage(payload: MessagePayload): Promise<MessageResult> {
    if (!this.socket) {
      return { externalId: '', status: 'FAILED', errorCode: 'NOT_CONNECTED' }
    }

    try {
      const result = await this.socket.sendMessage(
        phoneToJid(payload.to),
        buildMessageContent(payload)
      )
      return { externalId: result?.key.id ?? '', status: 'SENT' }
    } catch (err: unknown) {
      const errorCode =
        err instanceof Error ? err.message : 'UNKNOWN_SEND_ERROR'
      return { externalId: '', status: 'FAILED', errorCode }
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  /**
   * Creates the WASocket with auth state, version, and caches.
   * Shared between connect() and connectWithPairingCode().
   */
  private async createSocket(): Promise<{
    socket: WASocket
    saveCreds: () => Promise<void>
  }> {
    const { state, saveCreds } = await useMultiFileAuthState(
      `./baileys-sessions/${this.channelId}`
    )
    const { version } = await fetchLatestBaileysVersion()

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
    })

    return { socket, saveCreds }
  }

  /**
   * Retrieve a stored message for Baileys retry/resend mechanism.
   */
  private async getMessageForRetry(
    key: WAMessageKey
  ): Promise<Record<string, unknown> | undefined> {
    if (!key.id) return undefined

    const msg = await Message.findOne({ externalId: key.id }).lean().exec()
    if (!msg?.metadata || !isMessageMetadata(msg.metadata)) return undefined

    return msg.metadata
  }

  private setupEventListeners(
    socket: WASocket,
    events: BrokerEvents,
    saveCreds: () => Promise<void>
  ): void {
    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', (update) => {
      this.handleConnectionUpdate(update, events)
    })

    socket.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return

      for (const msg of messages) {
        if (msg.key.fromMe) continue
        if (!msg.key.remoteJid?.endsWith(WHATSAPP_JID_SUFFIX)) continue

        events.onMessage(toIncomingMessage(msg))
      }
    })

    socket.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        const mapped = mapWAStatusUpdate(update)
        if (mapped) events.onStatusUpdate(mapped)
      }
    })
  }

  private calculateBackoffDelay(): number {
    const baseDelay = RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts)
    const maxDelay = 120_000
    const jitter = Math.random() * 1_000
    return Math.min(baseDelay, maxDelay) + jitter
  }

  private handleConnectionUpdate(
    update: Partial<ConnectionState>,
    events: BrokerEvents
  ): void {
    // Handle QR and open states normally
    if (update.qr) {
      events.onConnectionUpdate('QR_PENDING', update.qr)
      return
    }

    if (update.connection === 'open') {
      this.reconnectAttempts = 0
      if (!this.connected) {
        this.connected = true
        events.onConnectionUpdate('CONNECTED')
      }
      return
    }

    if (update.connection === 'close') {
      if (shouldReconnect(update)) {
        this.reconnectAttempts += 1

        if (this.reconnectAttempts > this.maxReconnectAttempts) {
          this.connected = false
          this.logger.error(
            { channelId: this.channelId, attempts: this.reconnectAttempts },
            'Max reconnect attempts reached, giving up'
          )
          events.onConnectionUpdate('DISCONNECTED')
          return
        }

        const delay = this.calculateBackoffDelay()
        this.logger.info(
          { channelId: this.channelId, attempt: this.reconnectAttempts, delay },
          'Scheduling reconnect with backoff'
        )
        globalThis.setTimeout(() => {
          void this.connect({ ...events })
        }, delay)
      } else {
        // Permanent disconnect (loggedOut) — notify frontend
        this.connected = false
        events.onConnectionUpdate('DISCONNECTED')
      }
    }
  }
}
