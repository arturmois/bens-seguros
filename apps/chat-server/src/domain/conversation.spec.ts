import { describe, expect, it } from 'vitest'

import { ConversationEntity } from './conversation.js'
import {
  ConversationAlreadyAssignedError,
  InvalidConversationTransitionError,
} from './errors.js'
import type { ConversationData } from './types.js'

const DEFAULTS: ConversationData = {
  id: 'conv-1',
  tenantId: 'tenant-1',
  channelId: 'channel-1',
  contactId: 'contact-1',
  status: 'WAITING_HUMAN',
  assignedTo: null,
  assignedToName: null,
  subject: null,
  lastMessageText: null,
  lastMessageAt: null,
  whatsappPhone: '+5511999990001',
  closedAt: null,
  closedBy: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function makeConversation(
  overrides: Partial<ConversationData> = {}
): ConversationEntity {
  return ConversationEntity.restore({ ...DEFAULTS, ...overrides })
}

describe('ConversationEntity', () => {
  describe('create', () => {
    const input = {
      tenantId: 'tenant-1',
      channelId: 'channel-1',
      contactId: 'contact-1',
      whatsappPhone: '+5511999990001',
    }
    it('creates with BOT_ACTIVE when channel has AI', () => {
      const conv = ConversationEntity.create({ ...input, hasAi: true })
      expect(conv.status).toBe('BOT_ACTIVE')
      expect(conv.id).toBeDefined()
      expect(conv.tenantId).toBe('tenant-1')
      expect(conv.assignedTo).toBeNull()
      expect(conv.closedAt).toBeNull()
    })
    it('creates with WAITING_HUMAN when channel has no AI', () => {
      const conv = ConversationEntity.create({ ...input, hasAi: false })
      expect(conv.status).toBe('WAITING_HUMAN')
      expect(conv.assignedTo).toBeNull()
    })
  })
  describe('assign', () => {
    it('assigns agent to WAITING_HUMAN conversation', () => {
      const conv = makeConversation({ status: 'WAITING_HUMAN' })
      conv.assign('agent-1', 'João Silva')
      expect(conv.status).toBe('HUMAN_ACTIVE')
      expect(conv.assignedTo).toBe('agent-1')
      expect(conv.assignedToName).toBe('João Silva')
    })
    it('rejects assign on HUMAN_ACTIVE (already assigned)', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
        assignedToName: 'João Silva',
      })
      expect(() => conv.assign('agent-2', 'Maria')).toThrow(
        ConversationAlreadyAssignedError
      )
    })
    it('rejects assign on CLOSED', () => {
      const conv = makeConversation({ status: 'CLOSED' })
      expect(() => conv.assign('agent-1', 'João')).toThrow(
        InvalidConversationTransitionError
      )
    })
    it('rejects assign on BOT_ACTIVE', () => {
      const conv = makeConversation({ status: 'BOT_ACTIVE' })
      expect(() => conv.assign('agent-1', 'João')).toThrow(
        InvalidConversationTransitionError
      )
    })
  })
  describe('transfer', () => {
    it('transfers from HUMAN_ACTIVE to another agent', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
        assignedToName: 'João',
      })
      conv.transfer('agent-2', 'Maria Santos')
      expect(conv.status).toBe('HUMAN_ACTIVE')
      expect(conv.assignedTo).toBe('agent-2')
      expect(conv.assignedToName).toBe('Maria Santos')
    })
    it('rejects transfer from WAITING_HUMAN', () => {
      const conv = makeConversation({ status: 'WAITING_HUMAN' })
      expect(() => conv.transfer('agent-2', 'Maria')).toThrow(
        InvalidConversationTransitionError
      )
    })
    it('rejects transfer from CLOSED', () => {
      const conv = makeConversation({ status: 'CLOSED' })
      expect(() => conv.transfer('agent-2', 'Maria')).toThrow(
        InvalidConversationTransitionError
      )
    })
    it('rejects transfer from BOT_ACTIVE', () => {
      const conv = makeConversation({ status: 'BOT_ACTIVE' })
      expect(() => conv.transfer('agent-2', 'Maria')).toThrow(
        InvalidConversationTransitionError
      )
    })
  })
  describe('returnToQueue', () => {
    it('returns HUMAN_ACTIVE to WAITING_HUMAN', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
        assignedToName: 'João',
      })
      conv.returnToQueue()
      expect(conv.status).toBe('WAITING_HUMAN')
      expect(conv.assignedTo).toBeNull()
      expect(conv.assignedToName).toBeNull()
    })
    it('rejects from WAITING_HUMAN', () => {
      const conv = makeConversation({ status: 'WAITING_HUMAN' })
      expect(() => conv.returnToQueue()).toThrow(
        InvalidConversationTransitionError
      )
    })
    it('rejects from CLOSED', () => {
      const conv = makeConversation({ status: 'CLOSED' })
      expect(() => conv.returnToQueue()).toThrow(
        InvalidConversationTransitionError
      )
    })
    it('rejects from BOT_ACTIVE', () => {
      const conv = makeConversation({ status: 'BOT_ACTIVE' })
      expect(() => conv.returnToQueue()).toThrow(
        InvalidConversationTransitionError
      )
    })
  })
  describe('close', () => {
    it('closes HUMAN_ACTIVE', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
        assignedToName: 'João',
      })
      conv.close('agent-1')
      expect(conv.status).toBe('CLOSED')
      expect(conv.closedBy).toBe('agent-1')
      expect(conv.closedAt).toBeInstanceOf(Date)
    })
    it('closes BOT_ACTIVE (auto-close)', () => {
      const conv = makeConversation({ status: 'BOT_ACTIVE' })
      conv.close('system')
      expect(conv.status).toBe('CLOSED')
      expect(conv.closedBy).toBe('system')
    })
    it('closes WAITING_HUMAN (auto-close)', () => {
      const conv = makeConversation({ status: 'WAITING_HUMAN' })
      conv.close('system')
      expect(conv.status).toBe('CLOSED')
      expect(conv.closedBy).toBe('system')
    })
    it('rejects close on already CLOSED', () => {
      const conv = makeConversation({ status: 'CLOSED' })
      expect(() => conv.close('agent-1')).toThrow(
        InvalidConversationTransitionError
      )
    })
  })
  describe('escalateToHuman', () => {
    it('escalates from BOT_ACTIVE to WAITING_HUMAN', () => {
      const conv = makeConversation({ status: 'BOT_ACTIVE' })
      conv.escalateToHuman()
      expect(conv.status).toBe('WAITING_HUMAN')
    })
    it('rejects escalate from HUMAN_ACTIVE', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
        assignedToName: 'João',
      })
      expect(() => conv.escalateToHuman()).toThrow(
        InvalidConversationTransitionError
      )
    })
    it('rejects escalate from WAITING_HUMAN', () => {
      const conv = makeConversation({ status: 'WAITING_HUMAN' })
      expect(() => conv.escalateToHuman()).toThrow(
        InvalidConversationTransitionError
      )
    })
    it('rejects escalate from CLOSED', () => {
      const conv = makeConversation({ status: 'CLOSED' })
      expect(() => conv.escalateToHuman()).toThrow(
        InvalidConversationTransitionError
      )
    })
  })
  describe('returnToBot', () => {
    it('returns HUMAN_ACTIVE to BOT_ACTIVE and clears assignment', () => {
      const conv = makeConversation({
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-1',
        assignedToName: 'Joao',
      })
      conv.returnToBot()
      expect(conv.status).toBe('BOT_ACTIVE')
      expect(conv.assignedTo).toBeNull()
      expect(conv.assignedToName).toBeNull()
    })
    it('returns WAITING_HUMAN to BOT_ACTIVE', () => {
      const conv = makeConversation({ status: 'WAITING_HUMAN' })
      conv.returnToBot()
      expect(conv.status).toBe('BOT_ACTIVE')
    })
    it('rejects from BOT_ACTIVE', () => {
      const conv = makeConversation({ status: 'BOT_ACTIVE' })
      expect(() => conv.returnToBot()).toThrow(
        InvalidConversationTransitionError
      )
    })
    it('rejects from CLOSED', () => {
      const conv = makeConversation({ status: 'CLOSED' })
      expect(() => conv.returnToBot()).toThrow(
        InvalidConversationTransitionError
      )
    })
  })
  describe('restore', () => {
    it('restores entity with all properties', () => {
      const now = new Date()
      const conv = ConversationEntity.restore({
        id: 'conv-42',
        tenantId: 'tenant-1',
        channelId: 'channel-1',
        contactId: 'contact-1',
        status: 'HUMAN_ACTIVE',
        assignedTo: 'agent-7',
        assignedToName: 'Carlos',
        subject: 'Seguro auto',
        lastMessageText: 'Olá',
        lastMessageAt: now,
        whatsappPhone: '+5511999990001',
        closedAt: null,
        closedBy: null,
        createdAt: now,
        updatedAt: now,
      })
      expect(conv.id).toBe('conv-42')
      expect(conv.assignedTo).toBe('agent-7')
      expect(conv.subject).toBe('Seguro auto')
    })
  })
  describe('toJSON', () => {
    it('returns a plain copy of props', () => {
      const conv = makeConversation({ status: 'WAITING_HUMAN' })
      const json = conv.toJSON()
      expect(json.id).toBe('conv-1')
      expect(json.status).toBe('WAITING_HUMAN')
      expect(json).not.toBe(conv)
    })
  })
})
