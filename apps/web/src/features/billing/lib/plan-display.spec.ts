import { describe, expect, it } from 'vitest'

import type { ListBillingPlans200DataItem } from '@/api/model'

import { buildPlanHighlights, formatPlanPrice } from './plan-display'

function makePlan(
  overrides: Partial<ListBillingPlans200DataItem> = {}
): ListBillingPlans200DataItem {
  return {
    id: 'plan_1',
    slug: 'starter',
    name: 'Starter',
    description: 'desc',
    priceCents: 29900,
    currency: 'BRL',
    billingPeriod: 'MONTHLY',
    sortOrder: 1,
    maxUsers: 3,
    maxProposalsPerMonth: 100,
    maxChannels: 3,
    maxConversationsPerOrg: 100,
    maxImportRows: 500,
    maxLogoSizeBytes: 512 * 1024,
    aiEnabled: true,
    aiMessagesIncluded: 200,
    aiOverageCentsPerMessage: 30,
    features: {},
    ...overrides,
  }
}

describe('formatPlanPrice', () => {
  it('returns "Grátis" with no suffix for free plans', () => {
    expect(formatPlanPrice(makePlan({ priceCents: 0 }))).toEqual({
      amount: 'Grátis',
      suffix: null,
    })
  })

  it('formats monthly price in BRL with /mês suffix', () => {
    const result = formatPlanPrice(
      makePlan({ priceCents: 29900, billingPeriod: 'MONTHLY' })
    )
    expect(result.amount).toMatch(/R\$\s?299,00/)
    expect(result.suffix).toBe('/mês')
  })

  it('uses /ano suffix for yearly plans', () => {
    expect(
      formatPlanPrice(makePlan({ priceCents: 100000, billingPeriod: 'YEARLY' }))
        .suffix
    ).toBe('/ano')
  })
})

describe('buildPlanHighlights', () => {
  it('uses singular forms for single-unit limits', () => {
    const highlights = buildPlanHighlights(
      makePlan({
        maxUsers: 1,
        maxProposalsPerMonth: 10,
        maxChannels: 1,
        aiEnabled: false,
      })
    )
    expect(highlights).toContain('1 usuário')
    expect(highlights).toContain('10 propostas por mês')
    expect(highlights).toContain('1 canal de atendimento')
  })

  it('uses the singular proposal form for a single monthly proposal', () => {
    const highlights = buildPlanHighlights(
      makePlan({ maxProposalsPerMonth: 1 })
    )
    expect(highlights).toContain('1 proposta por mês')
  })

  it('uses "Até N" for multi-user limits and plural channels', () => {
    const highlights = buildPlanHighlights(
      makePlan({ maxUsers: 3, maxChannels: 3 })
    )
    expect(highlights).toContain('Até 3 usuários')
    expect(highlights).toContain('3 canais de atendimento')
  })

  it('renders "ilimitado" copy when a limit is null', () => {
    const highlights = buildPlanHighlights(
      makePlan({
        maxUsers: null,
        maxProposalsPerMonth: null,
        maxChannels: null,
      })
    )
    expect(highlights).toContain('Usuários ilimitados')
    expect(highlights).toContain('Propostas ilimitadas')
    expect(highlights).toContain('Canais ilimitados')
  })

  it('omits the AI line when AI is disabled', () => {
    const highlights = buildPlanHighlights(makePlan({ aiEnabled: false }))
    expect(highlights.some((line) => /IA/i.test(line))).toBe(false)
  })

  it('shows the included AI message quota formatted in pt-BR', () => {
    const highlights = buildPlanHighlights(
      makePlan({ aiEnabled: true, aiMessagesIncluded: 5000 })
    )
    expect(highlights).toContain('5.000 mensagens de IA por mês')
  })

  it('shows a generic AI line when enabled with no included quota', () => {
    const highlights = buildPlanHighlights(
      makePlan({ aiEnabled: true, aiMessagesIncluded: 0 })
    )
    expect(highlights).toContain('Assistente de IA')
  })

  it('appends labels for enabled feature flags only, in a stable order', () => {
    const highlights = buildPlanHighlights(
      makePlan({
        features: {
          customBranding: true,
          advancedReports: false,
          apiAccess: true,
          prioritySupport: true,
        },
      })
    )
    expect(highlights).toContain('Marca personalizada')
    expect(highlights).toContain('Acesso à API')
    expect(highlights).toContain('Suporte prioritário')
    expect(highlights).not.toContain('Relatórios avançados')
  })
})
