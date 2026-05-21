import { describe, expect, it } from 'vitest'

import {
  BUSINESS_SEGMENT_VALUES,
  businessDetailsSchema,
  businessSegmentSchema,
  shouldShowAreaM2,
  type BusinessSegment,
} from './insured-object-details-schema'

describe('shouldShowAreaM2', () => {
  it('returns true for null/undefined (safe default)', () => {
    expect(shouldShowAreaM2(null)).toBe(true)
    expect(shouldShowAreaM2(undefined)).toBe(true)
  })

  it('returns false for PROFESSIONAL_SERVICES, TECHNOLOGY, CONSULTING', () => {
    expect(shouldShowAreaM2('PROFESSIONAL_SERVICES')).toBe(false)
    expect(shouldShowAreaM2('TECHNOLOGY')).toBe(false)
    expect(shouldShowAreaM2('CONSULTING')).toBe(false)
  })

  it('returns true for INDUSTRY, RETAIL, WHOLESALE, OTHER and others', () => {
    expect(shouldShowAreaM2('INDUSTRY')).toBe(true)
    expect(shouldShowAreaM2('RETAIL')).toBe(true)
    expect(shouldShowAreaM2('WHOLESALE')).toBe(true)
    expect(shouldShowAreaM2('WAREHOUSE_LOGISTICS')).toBe(true)
    expect(shouldShowAreaM2('CONSTRUCTION')).toBe(true)
    expect(shouldShowAreaM2('HEALTH_CLINIC')).toBe(true)
    expect(shouldShowAreaM2('EDUCATION')).toBe(true)
    expect(shouldShowAreaM2('HOSPITALITY_RESTAURANT')).toBe(true)
    expect(shouldShowAreaM2('OTHER')).toBe(true)
  })
})

describe('BUSINESS_SEGMENT_VALUES', () => {
  it('contains all 12 expected segments', () => {
    expect(BUSINESS_SEGMENT_VALUES).toHaveLength(12)
    expect(BUSINESS_SEGMENT_VALUES).toContain('INDUSTRY')
    expect(BUSINESS_SEGMENT_VALUES).toContain('RETAIL')
    expect(BUSINESS_SEGMENT_VALUES).toContain('WHOLESALE')
    expect(BUSINESS_SEGMENT_VALUES).toContain('WAREHOUSE_LOGISTICS')
    expect(BUSINESS_SEGMENT_VALUES).toContain('CONSTRUCTION')
    expect(BUSINESS_SEGMENT_VALUES).toContain('HEALTH_CLINIC')
    expect(BUSINESS_SEGMENT_VALUES).toContain('EDUCATION')
    expect(BUSINESS_SEGMENT_VALUES).toContain('HOSPITALITY_RESTAURANT')
    expect(BUSINESS_SEGMENT_VALUES).toContain('PROFESSIONAL_SERVICES')
    expect(BUSINESS_SEGMENT_VALUES).toContain('TECHNOLOGY')
    expect(BUSINESS_SEGMENT_VALUES).toContain('CONSULTING')
    expect(BUSINESS_SEGMENT_VALUES).toContain('OTHER')
  })
})

describe('businessSegmentSchema', () => {
  it('accepts every BUSINESS_SEGMENT_VALUES entry', () => {
    for (const value of BUSINESS_SEGMENT_VALUES) {
      expect(businessSegmentSchema.safeParse(value).success).toBe(true)
    }
  })

  it('rejects unknown values', () => {
    expect(businessSegmentSchema.safeParse('NOT_A_SEGMENT').success).toBe(false)
    expect(businessSegmentSchema.safeParse('').success).toBe(false)
  })
})

describe('businessDetailsSchema', () => {
  const validBase = {
    branch: 'BUSINESS' as const,
    legalName: 'ACME Inc',
    cnpj: '00.000.000/0001-00',
    businessActivity: 'Consultoria de TI',
  }

  it('accepts businessSegment as optional value', () => {
    const result = businessDetailsSchema.safeParse({
      ...validBase,
      businessSegment: 'CONSULTING',
    })
    expect(result.success).toBe(true)
  })

  it('accepts BusinessDetails without businessSegment (backward compat)', () => {
    const result = businessDetailsSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('accepts null businessSegment explicitly', () => {
    const result = businessDetailsSchema.safeParse({
      ...validBase,
      businessSegment: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid businessSegment', () => {
    const result = businessDetailsSchema.safeParse({
      ...validBase,
      businessSegment: 'NOT_A_SEGMENT',
    })
    expect(result.success).toBe(false)
  })

  it('keeps the BusinessSegment type aligned with BUSINESS_SEGMENT_VALUES', () => {
    const acceptable: BusinessSegment = 'INDUSTRY'
    expect(BUSINESS_SEGMENT_VALUES).toContain(acceptable)
  })
})
