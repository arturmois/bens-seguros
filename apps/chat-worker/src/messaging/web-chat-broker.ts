import pino from 'pino'

import type {
  Broker,
  BrokerEvents,
  MessagePayload,
  MessageResult,
} from './broker.js'

const logger = pino({ name: 'web-chat-broker' })

export class WebChatBroker implements Broker {
  async connect(_events: BrokerEvents): Promise<void> {
    logger.info('WebChatBroker connected (stateless, no-op)')
  }

  async disconnect(): Promise<void> {
    logger.info('WebChatBroker disconnected (stateless, no-op)')
  }

  isConnected(): boolean {
    return true
  }

  async sendMessage(_payload: MessagePayload): Promise<MessageResult> {
    return {
      externalId: `webchat-${Date.now()}`,
      status: 'SENT',
    }
  }
}
