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
import { updateOrganizationRoute } from '../update-organization.js'

vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
  }
})

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(updateOrganizationRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

const validBody = { name: 'Corretora Atualizada', slug: 'corretora-atualizada' }

describe('PUT /api/v1/organization', () => {
  it('returns 200 with updated organization data', async () => {
    mockExecute.mockResolvedValue({
      view: {
        id: TEST_ORG_ID,
        name: 'Corretora Atualizada',
        slug: 'corretora-atualizada',
        logo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      before: { name: 'Corretora Original', slug: 'corretora-original' },
    })
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/organization',
      payload: validBody,
    })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('Corretora Atualizada')
    expect(body.data.slug).toBe('corretora-atualizada')
  })
  it('returns 409 when slug is taken by another organization', async () => {
    mockResolveError('SLUG_CONFLICT', 'Slug already taken')
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/organization',
      payload: validBody,
    })
    expect(response.statusCode).toBe(409)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('SLUG_CONFLICT')
  })
  it('returns 400 when slug has invalid characters', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/organization',
      payload: { name: 'Corretora', slug: 'Corretora INVÁLIDA' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when name is too short', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/organization',
      payload: { name: 'A', slug: 'corretora' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('returns 400 when body is missing', async () => {
    const response = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/organization',
      headers: { 'content-type': 'text/plain' },
    })
    expect(response.statusCode).toBe(400)
  })
  it('forwards organizationId, name and slug to the use case', async () => {
    mockExecute.mockResolvedValue({
      view: {
        id: TEST_ORG_ID,
        name: validBody.name,
        slug: validBody.slug,
        logo: null,
        createdAt: new Date(),
      },
      before: { name: 'old', slug: 'old' },
    })
    await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/organization',
      payload: validBody,
    })
    expect(mockExecute).toHaveBeenCalledWith({
      organizationId: TEST_ORG_ID,
      name: validBody.name,
      slug: validBody.slug,
    })
  })
})
