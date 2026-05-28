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

export type CreateOrgWithTrialDeps = {
  createOrganization: (input: {
    name: string
    ownerUserId: string
  }) => Promise<{ id: string }>
  findPlanBySlug: (slug: string) => Promise<{ id: string; slug: string } | null>
  createSubscription: (input: {
    organizationId: string
    planId: string
    status: 'TRIALING'
    trialEndsAt: Date
    currentPeriodStart: Date
    currentPeriodEnd: Date
  }) => Promise<{ id: string }>
  now: () => Date
  logger: Logger
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

const TRIAL_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

export async function createOrgWithTrial(
  deps: CreateOrgWithTrialDeps,
  input: CreateOrgWithTrialInput
): Promise<CreateOrgWithTrialResult> {
  const plan = await deps.findPlanBySlug(input.planSlug)
  if (plan === null) {
    throw new PlanNotFoundError(input.planSlug)
  }

  const now = deps.now()
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * MS_PER_DAY)

  const org = await deps.createOrganization({
    name: input.orgName,
    ownerUserId: input.ownerUserId,
  })

  const subscription = await deps.createSubscription({
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
