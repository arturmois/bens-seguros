import type { Broker } from './broker.js'
import { BaileysBroker } from './baileys-broker.js'
import { MetaBroker } from './meta-broker.js'
import { WebChatBroker } from './web-chat-broker.js'
import { MessengerBroker } from './messenger-broker.js'
import { InstagramBroker } from './instagram-broker.js'

export type BrokerType =
  | 'BAILEYS'
  | 'META'
  | 'WEB_CHAT'
  | 'MESSENGER'
  | 'INSTAGRAM'

export function createBroker(
  type: BrokerType,
  config: Record<string, unknown>
): Broker {
  switch (type) {
    case 'BAILEYS': {
      const tenantId = config.tenantId
      const channelId = config.channelId
      if (typeof tenantId !== 'string' || typeof channelId !== 'string') {
        throw new Error(
          'createBroker(BAILEYS): tenantId and channelId are required'
        )
      }

      return new BaileysBroker(tenantId, channelId)
    }
    case 'META':
      return new MetaBroker(config)
    case 'WEB_CHAT':
      return new WebChatBroker()
    case 'MESSENGER':
      return new MessengerBroker(config)
    case 'INSTAGRAM':
      return new InstagramBroker(config)
  }
}
