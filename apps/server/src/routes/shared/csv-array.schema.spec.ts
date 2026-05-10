import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { csvEnumArray, csvStringArray } from './csv-array.schema.js'

describe('csvStringArray', () => {
  it('parses comma-separated values into an array', () => {
    expect(csvStringArray().parse('a,b,c')).toEqual(['a', 'b', 'c'])
  })
  it('drops empty segments', () => {
    expect(csvStringArray().parse('a,,b,')).toEqual(['a', 'b'])
  })
  it('rejects empty input', () => {
    expect(() => csvStringArray().parse('')).toThrow()
    expect(() => csvStringArray().parse(',,')).toThrow()
  })
})

describe('csvEnumArray', () => {
  const schema = csvEnumArray(
    z.enum(['LEAD', 'CLIENT_ACTIVE', 'CLIENT_INACTIVE'])
  )
  it('parses valid enum CSV', () => {
    expect(schema.parse('LEAD,CLIENT_ACTIVE')).toEqual([
      'LEAD',
      'CLIENT_ACTIVE',
    ])
  })
  it('rejects invalid enum values', () => {
    expect(() => schema.parse('LEAD,UNKNOWN')).toThrow()
  })
})
