'use client'

import { useState } from 'react'
import { PricingCard } from './pricing-card'
import { PricingToggle } from './pricing-toggle'

interface PlanConfig {
  name: string
  monthlyPrice: number | null
  annualPrice: number | null
  features: readonly string[]
  popular: boolean
  dark: boolean
  ctaLabel: string
  ctaHref: string
}

const PLANS: readonly PlanConfig[] = [
  {
    name: 'Starter',
    monthlyPrice: 97,
    annualPrice: 78,
    features: [
      'Até 500 clientes',
      'Propostas e apólices',
      'Controle de comissões',
      'Suporte por email',
    ],
    popular: false,
    dark: false,
    ctaLabel: 'Começar Grátis',
    ctaHref: '/register',
  },
  {
    name: 'Pro',
    monthlyPrice: 197,
    annualPrice: 158,
    features: [
      'Clientes ilimitados',
      'Chat + WhatsApp integrado',
      'Dashboard avançado',
      'IA para atendimento',
      'Suporte prioritario',
    ],
    popular: true,
    dark: false,
    ctaLabel: 'Começar Grátis',
    ctaHref: '/register',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    features: [
      'Tudo do Pro',
      'API dedicada',
      'SLA garantido',
      'Onboarding personalizado',
      'Gerente de conta',
    ],
    popular: false,
    dark: true,
    ctaLabel: 'Falar com Vendas',
    ctaHref: '#faq',
  },
] as const

export function PricingSection(): React.ReactElement {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  return (
    <section id="precos" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-accent-700 text-center text-xs font-semibold uppercase tracking-widest">
          Preços
        </p>
        <h2 className="mt-4 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Planos que cabem no seu bolso
        </h2>
        <PricingToggle billing={billing} onBillingChange={setBilling} />
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} billing={billing} {...plan} />
          ))}
        </div>
      </div>
    </section>
  )
}
