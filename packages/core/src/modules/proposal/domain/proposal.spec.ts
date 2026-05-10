import { describe, it, expect } from 'vitest'
import { Proposal } from './proposal.js'
import {
  InvalidStageTransitionError,
  BranchMismatchError,
} from './proposal-errors.js'
import type { AutoDetails } from './insured-object-details.js'

describe('Proposal Entity', () => {
  const validProps = {
    organizationId: 'org-1',
    contactId: 'client-1',
    salespersonId: 'user-1',
    branch: 'AUTO' as const,
    boardType: 'NEW_INSURANCE' as const,
  }
  it('creates a new proposal in CAPTURE stage', () => {
    const proposal = Proposal.create(validProps)
    expect(proposal.stage).toBe('CAPTURE')
    expect(proposal.organizationId).toBe('org-1')
    expect(proposal.contactId).toBe('client-1')
    expect(proposal.salespersonId).toBe('user-1')
    expect(proposal.branch).toBe('AUTO')
    expect(proposal.boardType).toBe('NEW_INSURANCE')
    expect(proposal.premiumValueInCents).toBe(0)
    expect(proposal.commissionPercentageInCents).toBe(0)
    expect(proposal.lostReason).toBeNull()
    expect(proposal.id).toBeTruthy()
  })
  it('advances from CAPTURE to QUOTE', () => {
    const proposal = Proposal.create(validProps)
    proposal.advance()
    expect(proposal.stage).toBe('QUOTE')
  })
  it('advances through all stages to POLICY_ISSUED', () => {
    const proposal = Proposal.create(validProps)
    proposal.advance()
    proposal.advance()
    proposal.advance()
    proposal.advance()
    proposal.advance()
    expect(proposal.stage).toBe('POLICY_ISSUED')
  })
  it('cannot advance beyond POLICY_ISSUED', () => {
    const proposal = Proposal.create(validProps)
    for (let i = 0; i < 5; i++) proposal.advance()
    expect(() => proposal.advance()).toThrow(InvalidStageTransitionError)
  })
  it('marks as lost with reason', () => {
    const proposal = Proposal.create(validProps)
    proposal.advance()
    proposal.markAsLost('Cliente desistiu')
    expect(proposal.stage).toBe('LOST')
    expect(proposal.lostReason).toBe('Cliente desistiu')
  })
  it('can mark as lost from CAPTURE', () => {
    const proposal = Proposal.create(validProps)
    proposal.markAsLost('Sem interesse')
    expect(proposal.stage).toBe('LOST')
    expect(proposal.lostReason).toBe('Sem interesse')
  })
  it('cannot mark as lost from POLICY_ISSUED', () => {
    const proposal = Proposal.create(validProps)
    for (let i = 0; i < 5; i++) proposal.advance()
    expect(() => proposal.markAsLost('reason')).toThrow(
      InvalidStageTransitionError
    )
  })
  it('cannot mark as lost from LOST', () => {
    const proposal = Proposal.create(validProps)
    proposal.markAsLost('reason')
    expect(() => proposal.markAsLost('another')).toThrow(
      InvalidStageTransitionError
    )
  })
  it('cannot advance from LOST', () => {
    const proposal = Proposal.create(validProps)
    proposal.markAsLost('reason')
    expect(() => proposal.advance()).toThrow(InvalidStageTransitionError)
  })
  it('restores from persistence data', () => {
    const now = new Date()
    const proposal = Proposal.restore({
      id: 'prop-1',
      organizationId: 'org-1',
      contactId: 'client-1',
      salespersonId: 'user-1',
      stage: 'PROTOCOL',
      boardType: 'NEW_INSURANCE',
      branch: 'AUTO',
      premiumValueInCents: 50000,
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
    })
    expect(proposal.id).toBe('prop-1')
    expect(proposal.stage).toBe('PROTOCOL')
    expect(proposal.premiumValueInCents).toBe(50000)
    expect(proposal.commissionPercentageInCents).toBe(1500)
  })
  it('creates with optional premium and commission values', () => {
    const proposal = Proposal.create({
      ...validProps,
      premiumValueInCents: 100000,
      commissionPercentageInCents: 2000,
    })
    expect(proposal.premiumValueInCents).toBe(100000)
    expect(proposal.commissionPercentageInCents).toBe(2000)
  })
  it('creates with renewal policy reference', () => {
    const proposal = Proposal.create({
      ...validProps,
      boardType: 'RENEWAL',
      renewalPolicyId: 'policy-1',
    })
    expect(proposal.boardType).toBe('RENEWAL')
    expect(proposal.renewalPolicyId).toBe('policy-1')
  })
  it('creates renewal with renewalPolicyNumber', () => {
    const proposal = Proposal.create({
      ...validProps,
      boardType: 'RENEWAL',
      renewalPolicyNumber: 'POL-EXTERNAL-001',
    })
    expect(proposal.boardType).toBe('RENEWAL')
    expect(proposal.renewalPolicyNumber).toBe('POL-EXTERNAL-001')
    expect(proposal.renewalPolicyId).toBeNull()
  })
  it('creates endorsement proposals at QUOTE with source policy metadata', () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      contactId: 'client-1',
      salespersonId: 'user-1',
      branch: 'AUTO',
      boardType: 'ENDORSEMENT',
      sourcePolicyId: 'policy-1',
      endorsementType: 'COVERAGE_CHANGE',
      endorsementReason: 'Adicionar cobertura para vidros',
      sourcePolicySnapshot: {
        policyNumber: 'POL-001',
        clientName: 'Maria Souza',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
        endDate: new Date('2027-02-01T00:00:00.000Z'),
        status: 'ACTIVE',
        insurerId: 'ins-1',
        insurerName: 'Porto',
      },
    })
    expect(proposal.stage).toBe('QUOTE')
    expect(proposal.boardType).toBe('ENDORSEMENT')
    expect(proposal.sourcePolicyId).toBe('policy-1')
    expect(proposal.endorsementType).toBe('COVERAGE_CHANGE')
    expect(proposal.sourcePolicySnapshot?.policyNumber).toBe('POL-001')
  })
  it('serializes to JSON', () => {
    const proposal = Proposal.create(validProps)
    const json = proposal.toJSON()
    expect(json.id).toBe(proposal.id)
    expect(json.stage).toBe('CAPTURE')
    expect(json.organizationId).toBe('org-1')
  })
  describe('updateDetails', () => {
    const autoDetails: AutoDetails = {
      branch: 'AUTO',
      brand: 'Toyota',
      model: 'Corolla',
      manufacturingYear: 2024,
      modelYear: 2025,
    }
    it('updates details with matching branch', () => {
      const proposal = Proposal.create(validProps)
      proposal.updateDetails(autoDetails, 150000, 1500)
      expect(proposal.details).toEqual(autoDetails)
      expect(proposal.premiumValueInCents).toBe(150000)
      expect(proposal.commissionPercentageInCents).toBe(1500)
    })
    it('rejects details with mismatched branch', () => {
      const proposal = Proposal.create(validProps)
      const residentialDetails = {
        branch: 'RESIDENTIAL' as const,
        propertyType: 'Casa',
        propertyUsage: 'Habitual',
        cep: '01310100',
      }
      expect(() =>
        proposal.updateDetails(residentialDetails, 100000, 1000)
      ).toThrow(BranchMismatchError)
    })
  })
})
