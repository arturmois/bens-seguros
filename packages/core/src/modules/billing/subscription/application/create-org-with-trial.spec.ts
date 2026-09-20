import { describe, expect, it, vi } from 'vitest'
import type {
  CreateOrgWithTrialCallDeps,
  CreateOrgWithTrialInput,
} from './create-org-with-trial.js'
import {
  CreateOrgWithTrial,
  PlanNotFoundError,
} from './create-org-with-trial.js'
import type { SubscriptionRepository } from '../domain/subscription-repository.js'

const FIXED_NOW = new Date('2026-05-27T12:00:00.000Z')
const EXPECTED_TRIAL_END = new Date('2026-06-10T12:00:00.000Z') // +14d

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

function makeRepo(
  override?: Partial<SubscriptionRepository>
): SubscriptionRepository {
  return {
    findWithPlanByOrganizationId: vi.fn(),
    findByProviderCustomerId: vi.fn(),
    updateStatus: vi.fn(),
    upsertInvoice: vi.fn(),
    findPlanBySlug: vi
      .fn()
      .mockResolvedValue({ id: 'plan-1', slug: 'starter' }),
    createSubscription: vi.fn().mockResolvedValue({ id: 'sub-1' }),
    ...override,
  } as unknown as SubscriptionRepository
}

function makeCallDeps(
  override?: Partial<CreateOrgWithTrialCallDeps>
): CreateOrgWithTrialCallDeps {
  return {
    createOrganization: vi.fn().mockResolvedValue({ id: 'org-1' }),
    now: () => FIXED_NOW,
    logger: makeLogger(),
    ...override,
  }
}

const validInput: CreateOrgWithTrialInput = {
  ownerUserId: 'user-1',
  orgName: 'Corretora Teste',
  planSlug: 'starter',
}

describe('CreateOrgWithTrial', () => {
  it('happy path: cria org + subscription TRIALING e retorna IDs + trialEndsAt', async () => {
    const repo = makeRepo()
    const callDeps = makeCallDeps()
    const useCase = new CreateOrgWithTrial(repo)

    const result = await useCase.execute(validInput, callDeps)

    expect(result).toEqual({
      organizationId: 'org-1',
      subscriptionId: 'sub-1',
      trialEndsAt: EXPECTED_TRIAL_END,
    })
    expect(callDeps.createOrganization).toHaveBeenCalledWith({
      name: 'Corretora Teste',
      ownerUserId: 'user-1',
    })
    expect(repo.createSubscription).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planId: 'plan-1',
      status: 'TRIALING',
      trialEndsAt: EXPECTED_TRIAL_END,
      currentPeriodStart: FIXED_NOW,
      currentPeriodEnd: EXPECTED_TRIAL_END,
    })
  })

  it('planSlug inválido: throws PlanNotFoundError sem criar org', async () => {
    const findPlanBySlug = vi.fn().mockResolvedValue(null)
    const repo = makeRepo({ findPlanBySlug })
    const callDeps = makeCallDeps()
    const useCase = new CreateOrgWithTrial(repo)

    await expect(
      useCase.execute({ ...validInput, planSlug: 'inexistente' }, callDeps)
    ).rejects.toBeInstanceOf(PlanNotFoundError)
    expect(findPlanBySlug).toHaveBeenCalledWith('inexistente')
    expect(callDeps.createOrganization).not.toHaveBeenCalled()
    expect(repo.createSubscription).not.toHaveBeenCalled()
  })

  it('PlanNotFoundError expoe slug pra logging', async () => {
    const repo = makeRepo({ findPlanBySlug: vi.fn().mockResolvedValue(null) })
    const useCase = new CreateOrgWithTrial(repo)

    try {
      await useCase.execute(
        { ...validInput, planSlug: 'fantasma' },
        makeCallDeps()
      )
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(PlanNotFoundError)
      expect((err as PlanNotFoundError).slug).toBe('fantasma')
    }
  })

  it('createOrganization throw: propaga erro e não chama createSubscription', async () => {
    const repo = makeRepo()
    const callDeps = makeCallDeps({
      createOrganization: vi.fn().mockRejectedValue(new Error('slug conflict')),
    })
    const useCase = new CreateOrgWithTrial(repo)

    await expect(useCase.execute(validInput, callDeps)).rejects.toThrow(
      'slug conflict'
    )
    expect(repo.createSubscription).not.toHaveBeenCalled()
  })

  it('createSubscription throw: propaga erro (org pode ficar orfa — aceitavel MVP)', async () => {
    const repo = makeRepo({
      createSubscription: vi
        .fn()
        .mockRejectedValue(new Error('db unavailable')),
    })
    const callDeps = makeCallDeps()
    const useCase = new CreateOrgWithTrial(repo)

    await expect(useCase.execute(validInput, callDeps)).rejects.toThrow(
      'db unavailable'
    )
    expect(callDeps.createOrganization).toHaveBeenCalled()
  })

  it('logger.info chamado em sucesso com contexto útil', async () => {
    const logger = makeLogger()
    const repo = makeRepo()
    const callDeps = makeCallDeps({ logger })
    const useCase = new CreateOrgWithTrial(repo)

    await useCase.execute(validInput, callDeps)

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
