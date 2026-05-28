import { describe, expect, it, vi } from 'vitest'

import {
  createOrgWithTrial,
  PlanNotFoundError,
  type CreateOrgWithTrialDeps,
  type CreateOrgWithTrialInput,
} from './create-org-with-trial.js'

const FIXED_NOW = new Date('2026-05-27T12:00:00.000Z')
const EXPECTED_TRIAL_END = new Date('2026-06-10T12:00:00.000Z') // +14d

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

function makeDeps(
  overrides: Partial<CreateOrgWithTrialDeps> = {}
): CreateOrgWithTrialDeps {
  return {
    createOrganization: vi.fn().mockResolvedValue({ id: 'org-1' }),
    findPlanBySlug: vi
      .fn()
      .mockResolvedValue({ id: 'plan-1', slug: 'starter' }),
    createSubscription: vi.fn().mockResolvedValue({ id: 'sub-1' }),
    now: () => FIXED_NOW,
    logger: makeLogger(),
    ...overrides,
  }
}

const validInput: CreateOrgWithTrialInput = {
  ownerUserId: 'user-1',
  orgName: 'Corretora Teste',
  planSlug: 'starter',
}

describe('createOrgWithTrial', () => {
  it('happy path: cria org + subscription TRIALING e retorna IDs + trialEndsAt', async () => {
    const deps = makeDeps()

    const result = await createOrgWithTrial(deps, validInput)

    expect(result).toEqual({
      organizationId: 'org-1',
      subscriptionId: 'sub-1',
      trialEndsAt: EXPECTED_TRIAL_END,
    })
    expect(deps.createOrganization).toHaveBeenCalledWith({
      name: 'Corretora Teste',
      ownerUserId: 'user-1',
    })
    expect(deps.createSubscription).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planId: 'plan-1',
      status: 'TRIALING',
      trialEndsAt: EXPECTED_TRIAL_END,
      currentPeriodStart: FIXED_NOW,
      currentPeriodEnd: EXPECTED_TRIAL_END,
    })
  })

  it('planSlug invalido: throws PlanNotFoundError sem criar org', async () => {
    const findPlanBySlug = vi.fn().mockResolvedValue(null)
    const createOrganization = vi.fn()
    const createSubscription = vi.fn()
    const deps = makeDeps({
      findPlanBySlug,
      createOrganization,
      createSubscription,
    })

    await expect(
      createOrgWithTrial(deps, { ...validInput, planSlug: 'inexistente' })
    ).rejects.toBeInstanceOf(PlanNotFoundError)
    expect(findPlanBySlug).toHaveBeenCalledWith('inexistente')
    expect(createOrganization).not.toHaveBeenCalled()
    expect(createSubscription).not.toHaveBeenCalled()
  })

  it('PlanNotFoundError expoe slug pra logging', async () => {
    const deps = makeDeps({
      findPlanBySlug: vi.fn().mockResolvedValue(null),
    })

    try {
      await createOrgWithTrial(deps, { ...validInput, planSlug: 'fantasma' })
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(PlanNotFoundError)
      expect((err as PlanNotFoundError).slug).toBe('fantasma')
    }
  })

  it('createOrganization throw: propaga erro e nao chama createSubscription', async () => {
    const createSubscription = vi.fn()
    const deps = makeDeps({
      createOrganization: vi.fn().mockRejectedValue(new Error('slug conflict')),
      createSubscription,
    })

    await expect(createOrgWithTrial(deps, validInput)).rejects.toThrow(
      'slug conflict'
    )
    expect(createSubscription).not.toHaveBeenCalled()
  })

  it('createSubscription throw: propaga erro (org pode ficar orfa — aceitavel MVP)', async () => {
    const deps = makeDeps({
      createSubscription: vi
        .fn()
        .mockRejectedValue(new Error('db unavailable')),
    })

    await expect(createOrgWithTrial(deps, validInput)).rejects.toThrow(
      'db unavailable'
    )
    expect(deps.createOrganization).toHaveBeenCalled()
  })

  it('logger.info chamado em sucesso com contexto util', async () => {
    const logger = makeLogger()
    const deps = makeDeps({ logger })

    await createOrgWithTrial(deps, validInput)

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        subscriptionId: 'sub-1',
        planSlug: 'starter',
        trialEndsAt: EXPECTED_TRIAL_END,
      }),
      'Org created with trial subscription'
    )
  })
})
