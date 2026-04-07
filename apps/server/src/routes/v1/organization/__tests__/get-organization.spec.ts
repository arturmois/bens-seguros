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
import { makeOrganization } from '../../../../__tests__/helpers/factories.js'
import { getOrganizationRoute } from '../get-organization.js'

vi.mock('@repo/db', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/db')>()
  return {
    ...mod,
    prisma: {
      organization: {
        findUnique: vi.fn(),
      },
    },
  }
})

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(getOrganizationRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('GET /api/v1/organization', () => {
  it('returns 200 with organization data', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(
      makeOrganization() as unknown as Awaited<
        ReturnType<typeof prisma.organization.findUnique>
      >
    )

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/organization',
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe(TEST_ORG_ID)
    expect(body.data.name).toBe('Corretora Exemplo')
    expect(body.data.slug).toBe('corretora-exemplo')
    expect(body.data.logo).toBeNull()
  })

  it('returns 404 when organization is not found', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)

    const response = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/organization',
    })

    expect(response.statusCode).toBe(404)
    const body = response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('ORGANIZATION_NOT_FOUND')
  })

  it('queries prisma with current organization id', async () => {
    const { prisma } = await import('@repo/db')
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(
      makeOrganization() as unknown as Awaited<
        ReturnType<typeof prisma.organization.findUnique>
      >
    )

    await injectAs(app, { method: 'GET', url: '/api/v1/organization' })

    expect(vi.mocked(prisma.organization.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: TEST_ORG_ID } })
    )
  })
})
