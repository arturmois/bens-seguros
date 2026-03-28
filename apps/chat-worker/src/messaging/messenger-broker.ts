import pino from 'pino'

import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker.js'

const logger = pino({ name: 'messenger-broker' })

export class MessengerBroker implements Broker {
  private readonly config: Record<string, unknown>

  constructor(config: Record<string, unknown>) {
    this.config = config
  }

  async connect(_events: BrokerEvents): Promise<void> {
    logger.info('MessengerBroker connected (stateless, no-op)')
  }

  async disconnect(): Promise<void> {
    logger.info('MessengerBroker disconnected (stateless, no-op)')
  }

  isConnected(): boolean {
    return true
  }

  async sendMessage(_payload: MessagePayload): Promise<MessageResult> {
    throw new Error('MessengerBroker.sendMessage is not yet implemented')
  }
}
