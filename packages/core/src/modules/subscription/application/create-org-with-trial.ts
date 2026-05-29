import { inject, injectable } from 'tsyringe'
import type { SubscriptionRepository } from '../domain/subscription-repository.js'

export type Logger = {
  info: (msg: object | string, ...args: unknown[]) => void
  warn: (msg: object | string, ...args: unknown[]) => void
  error: (msg: object | string, ...args: unknown[]) => void
}

export class PlanNotFoundError extends Error {
  constructor(readonly slug: string) {
    super(`Plan not found: ${slug}`)
    this.name = 'PlanNotFoundError'
  }
}

export type CreateOrgWithTrialInput = {
  ownerUserId: string
  orgName: string
  planSlug: string
}

export type CreateOrgWithTrialResult = {
  organizationId: string
  subscriptionId: string
  trialEndsAt: Date
}

// Deps that vary per caller and do not belong in the repository (auth API, clock)
export type CreateOrgWithTrialCallDeps = {
  createOrganization: (input: {
    name: string
    ownerUserId: string
  }) => Promise<{ id: string }>
  now: () => Date
  logger: Logger
}

const TRIAL_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

@injectable()
export class CreateOrgWithTrial {
  constructor(
    @inject('SubscriptionRepository')
    private readonly subscriptionRepo: SubscriptionRepository
  ) {}

  async execute(
    input: CreateOrgWithTrialInput,
    deps: CreateOrgWithTrialCallDeps
  ): Promise<CreateOrgWithTrialResult> {
    const plan = await this.subscriptionRepo.findPlanBySlug(input.planSlug)
    if (plan === null) {
      throw new PlanNotFoundError(input.planSlug)
    }

    const now = deps.now()
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * MS_PER_DAY)

    const org = await deps.createOrganization({
      name: input.orgName,
      ownerUserId: input.ownerUserId,
    })

    const subscription = await this.subscriptionRepo.createSubscription({
      organizationId: org.id,
      planId: plan.id,
      status: 'TRIALING',
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
    })

    deps.logger.info(
      {
        organizationId: org.id,
        subscriptionId: subscription.id,
        planSlug: input.planSlug,
        trialEndsAt,
      },
      'Org created with trial subscription'
    )

    return {
      organizationId: org.id,
      subscriptionId: subscription.id,
      trialEndsAt,
    }
  }
}
