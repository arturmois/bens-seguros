import { container } from 'tsyringe'
import type { AppLogger } from '../logger.js'

import { QueueProducer } from '../queue/queue-producer.js'
import { MongooseContactRepository } from '../repository/mongoose-contact-repository.js'
import { MongooseConversationRepository } from '../repository/mongoose-conversation-repository.js'
import { MongooseMessageRepository } from '../repository/mongoose-message-repository.js'
import { MongooseUnreadRepository } from '../repository/mongoose-unread-repository.js'

interface QueueConnectionOptions {
  readonly host: string
  readonly port: number
  readonly maxRetriesPerRequest: null
}

export function registerDependencies(
  queueConnection: QueueConnectionOptions,
  logger: AppLogger
): void {
  const conversationRepo = new MongooseConversationRepository()
  const messageRepo = new MongooseMessageRepository()
  const contactRepo = new MongooseContactRepository()
  const unreadRepo = new MongooseUnreadRepository()
  const queueProducer = new QueueProducer(queueConnection, logger)
  container.registerInstance('ConversationRepository', conversationRepo)
  container.registerInstance('MessageRepository', messageRepo)
  container.registerInstance('ContactRepository', contactRepo)
  container.registerInstance('UnreadRepository', unreadRepo)
  container.registerInstance('QueueProducer', queueProducer)
  container.registerInstance('Logger', logger)
  logger.info('DI container: all dependencies registered')
}
