import type { PrismaClient } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import type {
  CreateSubscriptionInput,
  PlanRow,
  SubscriptionBillingRow,
  SubscriptionRepository,
  SubscriptionWithPlan,
} from '../domain/subscription-repository.js'

@injectable()
export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async findWithPlanByOrganizationId(
    organizationId: string
  ): Promise<SubscriptionWithPlan | null> {
    return this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    })
  }

  async findByProviderCustomerId(
    providerCustomerId: string
  ): Promise<SubscriptionBillingRow | null> {
    const row = await this.prisma.subscription.findUnique({
      where: { billingProviderCustomerId: providerCustomerId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        billingManagedExternally: true,
      },
    })
    if (row === null) return null
    return {
      id: row.id,
      organizationId: row.organizationId,
      status: row.status,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      billingManagedExternally: row.billingManagedExternally,
    }
  }

  async updateStatus(
    subscriptionId: string,
    status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED',
    opts?: { canceledAt?: Date }
  ): Promise<void> {
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status,
        ...(opts?.canceledAt ? { canceledAt: opts.canceledAt } : {}),
      },
    })
  }

  async upsertInvoice(input: {
    organizationId: string
    subscriptionId: string
    billingProviderPaymentId: string
    amountCents: number
    status: 'PAID' | 'OVERDUE' | 'REFUNDED'
    paidAt?: Date
    periodStart: Date
    periodEnd: Date
  }): Promise<void> {
    // billingProvider hardcoded as 'ASAAS' — the only provider in production today.
    // TODO: parametrize input.billingProvider when a second provider is added.
    await this.prisma.invoice.upsert({
      where: { billingProviderPaymentId: input.billingProviderPaymentId },
      create: {
        organizationId: input.organizationId,
        subscriptionId: input.subscriptionId,
        billingProvider: 'ASAAS',
        billingProviderPaymentId: input.billingProviderPaymentId,
        amountCents: input.amountCents,
        baseAmountCents: input.amountCents,
        status: input.status,
        dueDate: input.periodEnd,
        paidAt: input.paidAt,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
      update: {
        status: input.status,
        paidAt: input.paidAt,
      },
    })
  }

  async findPlanBySlug(slug: string): Promise<PlanRow | null> {
    const p = await this.prisma.plan.findUnique({
      where: { slug },
      select: { id: true, slug: true, active: true },
    })
    return p !== null && p.active ? { id: p.id, slug: p.slug } : null
  }

  async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<{ id: string }> {
    return this.prisma.subscription.create({
      data: input,
      select: { id: true },
    })
  }
}
