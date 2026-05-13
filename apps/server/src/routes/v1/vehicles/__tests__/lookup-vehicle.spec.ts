import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest'
import {
  createTestApp,
  injectAs,
  setTestContext,
} from '../../../../__tests__/helpers/create-test-app.js'
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { lookupVehicleRoute } from '../lookup-vehicle.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(lookupVehicleRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const RESULT = {
  data: {
    brand: 'FIAT',
    model: 'MOBI EASY 1.0',
    manufacturingYear: 2019,
    modelYear: 2020,
    color: 'BRANCO',
    fuelType: 'FLEX',
    chassi: '9BWZZZ377VT004251',
    plate: 'ABC1D23',
  },
  source: 'apibrasil' as const,
}

describe('POST /api/v1/vehicles/lookup', () => {
  it('returns 200 with vehicle data and meta.source', async () => {
    mockExecute.mockResolvedValue(RESULT)
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/vehicles/lookup',
      payload: { plate: 'ABC1D23' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.success).toBe(true)
    expect(body.data.brand).toBe('FIAT')
    expect(body.meta.source).toBe('apibrasil')
  })

  it('returns 400 for invalid plate', async () => {
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/vehicles/lookup',
      payload: { plate: '123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when neither plate nor chassi provided', async () => {
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/vehicles/lookup',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when use case throws PlateNotFoundError', async () => {
    const { PlateNotFoundError } = await import('@repo/core')
    mockExecute.mockRejectedValue(new PlateNotFoundError())
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/vehicles/lookup',
      payload: { plate: 'ABC1D23' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('PLATE_NOT_FOUND')
  })

  it('returns 503 when use case throws LookupProviderUnavailableError', async () => {
    const { LookupProviderUnavailableError } = await import('@repo/core')
    mockExecute.mockRejectedValue(new LookupProviderUnavailableError())
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/vehicles/lookup',
      payload: { plate: 'ABC1D23' },
    })
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toBe('PROVIDER_UNAVAILABLE')
  })
})
