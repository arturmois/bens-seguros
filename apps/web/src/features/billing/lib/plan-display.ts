import type { ListBillingPlans200DataItem } from '@/api/model'
import { formatCurrency } from '@/lib/formatters'

type Plan = ListBillingPlans200DataItem

const FEATURE_FLAG_LABEL: Readonly<Record<string, string>> = {
  customBranding: 'Marca personalizada',
  advancedReports: 'Relatórios avançados',
  apiAccess: 'Acesso à API',
  prioritySupport: 'Suporte prioritário',
}

export interface PlanPrice {
  amount: string
  suffix: string | null
}

export function formatPlanPrice(plan: Plan): PlanPrice {
  if (plan.priceCents === 0) {
    return { amount: 'Grátis', suffix: null }
  }
  return {
    amount: formatCurrency(plan.priceCents),
    suffix: plan.billingPeriod === 'YEARLY' ? '/ano' : '/mês',
  }
}

export function buildPlanHighlights(plan: Plan): string[] {
  const highlights = [
    usersLine(plan.maxUsers),
    proposalsLine(plan.maxProposalsPerMonth),
    channelsLine(plan.maxChannels),
  ]

  const ai = aiLine(plan)
  if (ai !== null) highlights.push(ai)

  for (const [key, label] of Object.entries(FEATURE_FLAG_LABEL)) {
    if (plan.features[key] === true) {
      highlights.push(label)
    }
  }

  return highlights
}

function usersLine(max: number | null): string {
  if (max === null) return 'Usuários ilimitados'
  if (max === 1) return '1 usuário'
  return `Até ${max} usuários`
}

function proposalsLine(max: number | null): string {
  if (max === null) return 'Propostas ilimitadas'
  if (max === 1) return '1 proposta por mês'
  return `${max} propostas por mês`
}

function channelsLine(max: number | null): string {
  if (max === null) return 'Canais ilimitados'
  if (max === 1) return '1 canal de atendimento'
  return `${max} canais de atendimento`
}

function aiLine(plan: Plan): string | null {
  if (!plan.aiEnabled) return null
  if (plan.aiMessagesIncluded > 0) {
    return `${plan.aiMessagesIncluded.toLocaleString('pt-BR')} mensagens de IA por mês`
  }
  return 'Assistente de IA'
}
