import type { FastifyReply } from 'fastify'

import {
  ConversationAlreadyAssignedError,
  ConversationNotFoundError,
  InvalidConversationTransitionError,
} from '../../../domain/errors.js'

export function handleDomainError(error: unknown, reply: FastifyReply): void {
  if (error instanceof ConversationNotFoundError) {
    void reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
    return
  }
  if (error instanceof InvalidConversationTransitionError) {
    void reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
    return
  }
  if (error instanceof ConversationAlreadyAssignedError) {
    void reply.status(409).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
    return
  }
  throw error
}
