import type {
  GetBillingCurrent200DataEntitlements,
  GetBillingCurrent200DataSubscription,
  ListBillingInvoices200DataItem,
} from '@/api/model'

type InvoiceStatus = ListBillingInvoices200DataItem['status']

type Subscription = NonNullable<GetBillingCurrent200DataSubscription>
type SubscriptionStatus = Subscription['status']
type PlanSlug = Subscription['plan']['slug']

type Entitlements = GetBillingCurrent200DataEntitlements
type BooleanEntitlementKey = {
  [K in keyof Entitlements]: Entitlements[K] extends boolean ? K : never
}[keyof Entitlements]

type UpgradableFeature = Exclude<
  BooleanEntitlementKey,
  'isActive' | 'isTrialing' | 'billingManagedExternally'
>

export const FEATURE_LABEL: Record<UpgradableFeature, string> = {
  aiEnabled: 'Assistente IA',
  customBranding: 'Marca personalizada',
  apiAccess: 'Acesso à API',
  advancedReports: 'Relatórios avançados',
  prioritySupport: 'Suporte prioritário',
}

export const UPGRADABLE_FEATURE_KEYS = Object.keys(
  FEATURE_LABEL
) as readonly UpgradableFeature[]

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Atrasado',
  CANCELED: 'Cancelado',
  REFUNDED: 'Reembolsado',
}

export const INVOICE_STATUS_VARIANT: Record<
  InvoiceStatus,
  'success' | 'warning' | 'error' | 'secondary' | 'info'
> = {
  PENDING: 'info',
  PAID: 'success',
  OVERDUE: 'warning',
  CANCELED: 'secondary',
  REFUNDED: 'error',
}

export const INVOICE_STATUS_KEYS = Object.keys(
  INVOICE_STATUS_LABEL
) as readonly InvoiceStatus[]

export type { BooleanEntitlementKey, InvoiceStatus, UpgradableFeature }

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
