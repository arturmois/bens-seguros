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
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { updateInsurerRoute } from '../update-insurer.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(updateInsurerRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const INSURER_ID = 'insurer-id-001'

const validInsurer = {
  id: INSURER_ID,
  organizationId: TEST_ORG_ID,
  name: 'Porto Seguro Updated',
  code: 'PSU',
  active: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('PUT /api/v1/insurers/:id', () => {
  it('returns 200 with updated insurer data', async () => {
    mockExecute.mockResolvedValue(validInsurer)

    const response = await injectAs(app, {
      method: 'PUT',
      url: `/api/v1/insurers/${INSURER_ID}`,
      payload: { name: 'Porto Seguro Updated', code: 'PSU', active: false },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Porto Seguro Updated')
    expect(body.data.active).toBe(false)
  })

  it('returns 400 when name is missing', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: `/api/v1/insurers/${INSURER_ID}`,
      payload: { code: 'PS', active: true },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when active field is missing', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: `/api/v1/insurers/${INSURER_ID}`,
      payload: { name: 'Porto Seguro' },
    })

    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when insurer is not found', async () => {
    mockResolveError('INSURER_NOT_FOUND', 'Insurer not found')

    const response = await injectAs(app, {
      method: 'PUT',
      url: `/api/v1/insurers/${INSURER_ID}`,
      payload: { name: 'Porto Seguro', code: 'PS', active: true },
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INSURER_NOT_FOUND')
  })
})
