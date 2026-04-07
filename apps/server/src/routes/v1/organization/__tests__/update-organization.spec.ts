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
import { updateOrganizationRoute } from '../update-organization.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      organization: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(updateOrganizationRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

const makeOrg = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: TEST_ORG_ID,
  name: 'Corretora Atualizada',
  slug: 'corretora-atualizada',
  logo: null,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
})

const validBody = { name: 'Corretora Atualizada', slug: 'corretora-atualizada' }

describe('PUT /api/v1/organization', () => {
  it('returns 200 with updated organization data', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.organization.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(
      makeOrg() as never
    )
    vi.mocked(prisma.organization.update).mockResolvedValue(makeOrg() as never)

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
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({
      id: 'other-org-id',
    } as never)

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
})
