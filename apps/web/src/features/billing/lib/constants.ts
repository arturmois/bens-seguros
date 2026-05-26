import type { GetBillingCurrent200DataSubscription } from '@/api/model'

type Subscription = NonNullable<GetBillingCurrent200DataSubscription>
type SubscriptionStatus = Subscription['status']
type PlanSlug = Subscription['plan']['slug']

export const PLAN_LABEL: Record<string, string> = {
  free: 'Gratuito',
  starter: 'Iniciante',
  pro: 'Profissional',
  business: 'Empresarial',
}

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIALING: 'Em avaliação',
  ACTIVE: 'Ativo',
  PAST_DUE: 'Pagamento atrasado',
  CANCELED: 'Cancelado',
  EXPIRED: 'Expirado',
  BILLED_EXTERNALLY: 'Plano comercial',
}

export const STATUS_VARIANT: Record<
  SubscriptionStatus,
  'success' | 'warning' | 'error' | 'info' | 'secondary'
> = {
  TRIALING: 'info',
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELED: 'secondary',
  EXPIRED: 'error',
  BILLED_EXTERNALLY: 'info',
}

export function planLabel(slug: PlanSlug): string {
  return PLAN_LABEL[slug] ?? slug
}
