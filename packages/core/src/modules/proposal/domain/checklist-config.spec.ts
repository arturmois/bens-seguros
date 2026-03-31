import { describe, it, expect } from 'vitest'
import { StaticChecklistConfig } from './checklist-config.js'

describe('StaticChecklistConfig', () => {
  const config = new StaticChecklistConfig()

  it('returns "Proposta protocolada no Broker/Qualex" for PROTOCOL stage', () => {
    const items = config.getItems('PROTOCOL', 'AUTO')
    const protocolItem = items.find((i) => i.itemKey === 'protocol_registered')

    expect(protocolItem).toBeDefined()
    expect(protocolItem!.label).toBe('Proposta protocolada no Broker/Qualex')
  })

  it('returns base items merged with branch extras for CAPTURE + AUTO', () => {
    const items = config.getItems('CAPTURE', 'AUTO')
    const keys = items.map((i) => i.itemKey)

    expect(keys).toContain('client_data')
    expect(keys).toContain('driver_license')
    expect(keys).toContain('vehicle_registration')
  })
})
