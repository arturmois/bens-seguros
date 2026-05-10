import { describe, it, expect, beforeEach } from 'vitest'
import { Proposal } from './proposal.js'
import { InvalidCoverageDatesError } from './proposal-errors.js'
import type { ProposalProps } from './proposal.js'

function createTestProposal(): Proposal {
  const now = new Date()
  const props: ProposalProps = {
    id: 'prop-test-1',
    organizationId: 'org-1',
    contactId: 'client-1',
    salespersonId: 'user-1',
    stage: 'QUOTE',
    boardType: 'NEW_INSURANCE',
    branch: 'AUTO',
    premiumValueInCents: 100000,
    commissionPercentageInCents: 1500,
    details: null,
    lostReason: null,
    renewalPolicyId: null,
    renewalPolicyNumber: null,
    sourcePolicyId: null,
    endorsementType: null,
    endorsementReason: null,
    sourcePolicySnapshot: null,
    insurerId: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    coverageStartDate: null,
    coverageEndDate: null,
    sentToClientAt: null,
    clientResponseAt: null,
    quoteValidUntil: null,
  }
  return Proposal.restore(props)
}

describe('Proposal date properties and methods', () => {
  let proposal: Proposal
  beforeEach(() => {
    proposal = createTestProposal()
  })
  describe('updateCoverageDates', () => {
    it('sets coverage dates when end is after start', () => {
      const start = new Date('2026-06-01T00:00:00.000Z')
      const end = new Date('2027-06-01T00:00:00.000Z')
      proposal.updateCoverageDates(start, end)
      expect(proposal.coverageStartDate).toEqual(start)
      expect(proposal.coverageEndDate).toEqual(end)
    })
    it('rejects when end date equals start date', () => {
      const date = new Date('2026-06-01T00:00:00.000Z')
      expect(() => proposal.updateCoverageDates(date, date)).toThrow(
        InvalidCoverageDatesError
      )
    })
    it('rejects when end date is before start date', () => {
      const start = new Date('2026-06-01T00:00:00.000Z')
      const end = new Date('2026-05-01T00:00:00.000Z')
      expect(() => proposal.updateCoverageDates(start, end)).toThrow(
        InvalidCoverageDatesError
      )
    })
    it('rejects with the correct error message', () => {
      const start = new Date('2026-06-01T00:00:00.000Z')
      const end = new Date('2026-05-01T00:00:00.000Z')
      expect(() => proposal.updateCoverageDates(start, end)).toThrow(
        'Data de fim deve ser posterior à data de início'
      )
    })
    it('updates updatedAt when setting coverage dates', () => {
      const before = proposal.toJSON().updatedAt
      const start = new Date('2026-06-01T00:00:00.000Z')
      const end = new Date('2027-06-01T00:00:00.000Z')
      proposal.updateCoverageDates(start, end)
      expect(proposal.toJSON().updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
    })
  })
  describe('markAsSentToClient', () => {
    it('sets sentToClientAt to current date', () => {
      const beforeCall = new Date()
      proposal.markAsSentToClient()
      expect(proposal.toJSON().sentToClientAt).not.toBeNull()
      expect(
        proposal.toJSON().sentToClientAt!.getTime()
      ).toBeGreaterThanOrEqual(beforeCall.getTime())
    })
    it('overwrites previous sentToClientAt on resend', () => {
      proposal.markAsSentToClient()
      const firstSentAt = proposal.toJSON().sentToClientAt
      proposal.markAsSentToClient()
      const secondSentAt = proposal.toJSON().sentToClientAt
      expect(secondSentAt).not.toBeNull()
      expect(firstSentAt).not.toBeNull()
      expect(secondSentAt!.getTime()).toBeGreaterThanOrEqual(
        firstSentAt!.getTime()
      )
    })
    it('updates updatedAt when marking as sent', () => {
      const before = proposal.toJSON().updatedAt
      proposal.markAsSentToClient()
      expect(proposal.toJSON().updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
    })
  })
  describe('updateClientResponse', () => {
    it('sets clientResponseAt to the given date', () => {
      const responseDate = new Date('2026-06-15T10:00:00.000Z')
      proposal.updateClientResponse(responseDate)
      expect(proposal.toJSON().clientResponseAt).toEqual(responseDate)
    })
    it('updates updatedAt when setting client response', () => {
      const before = proposal.toJSON().updatedAt
      const responseDate = new Date('2026-06-15T10:00:00.000Z')
      proposal.updateClientResponse(responseDate)
      expect(proposal.toJSON().updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
    })
  })
  describe('updateQuoteValidity', () => {
    it('sets quoteValidUntil to the given date', () => {
      const validUntil = new Date('2026-06-30T23:59:59.000Z')
      proposal.updateQuoteValidity(validUntil)
      expect(proposal.quoteValidUntil).toEqual(validUntil)
    })
    it('updates updatedAt when setting quote validity', () => {
      const before = proposal.toJSON().updatedAt
      const validUntil = new Date('2026-06-30T23:59:59.000Z')
      proposal.updateQuoteValidity(validUntil)
      expect(proposal.toJSON().updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      )
    })
  })
  describe('isQuoteExpired getter', () => {
    it('returns false when quoteValidUntil is null', () => {
      expect(proposal.isQuoteExpired).toBe(false)
    })
    it('returns true when quoteValidUntil is in the past', () => {
      const pastDate = new Date('2020-01-01T00:00:00.000Z')
      proposal.updateQuoteValidity(pastDate)
      expect(proposal.isQuoteExpired).toBe(true)
    })
    it('returns false when quoteValidUntil is in the future', () => {
      const futureDate = new Date('2099-12-31T23:59:59.000Z')
      proposal.updateQuoteValidity(futureDate)
      expect(proposal.isQuoteExpired).toBe(false)
    })
  })
  describe('initial state', () => {
    it('has all date fields null by default after create', () => {
      const created = Proposal.create({
        organizationId: 'org-1',
        contactId: 'client-1',
        salespersonId: 'user-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      })
      expect(created.coverageStartDate).toBeNull()
      expect(created.coverageEndDate).toBeNull()
      expect(created.toJSON().sentToClientAt).toBeNull()
      expect(created.toJSON().clientResponseAt).toBeNull()
      expect(created.quoteValidUntil).toBeNull()
    })
    it('accepts quoteValidUntil in CreateProposalInput', () => {
      const validUntil = new Date('2026-07-31T00:00:00.000Z')
      const created = Proposal.create({
        organizationId: 'org-1',
        contactId: 'client-1',
        salespersonId: 'user-1',
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
        quoteValidUntil: validUntil,
      })
      expect(created.quoteValidUntil).toEqual(validUntil)
    })
  })
})
