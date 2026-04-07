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
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { reopenProposalRoute } from '../reopen-proposal.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(reopenProposalRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockExecute.mockResolvedValue(undefined)
  mockResolve(mockExecute)
})

describe('POST /api/v1/proposals/:id/reopen', () => {
  it('returns 200 with null data on success', async () => {
    // No body — omit content-type to avoid FST_ERR_CTP_EMPTY_JSON_BODY
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/reopen',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeNull()
  })

  it('calls use case with id and organizationId', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/reopen',
    })

    expect(mockExecute).toHaveBeenCalledWith('p-001', TEST_ORG_ID)
  })

  it('returns 404 when proposal does not exist', async () => {
    mockResolveError('PROPOSAL_NOT_FOUND', 'Proposal not found')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/nonexistent/reopen',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.error.code).toBe('PROPOSAL_NOT_FOUND')
  })

  it('returns 422 on INVALID_STAGE_TRANSITION error', async () => {
    mockResolveError(
      'INVALID_STAGE_TRANSITION',
      'Cannot reopen non-lost proposal'
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/proposals/p-001/reopen',
    })

    expect(response.statusCode).toBe(422)
    const body = response.json()
    expect(body.error.code).toBe('INVALID_STAGE_TRANSITION')
  })
})
