import Link from 'next/link'
import { Check } from 'lucide-react'

interface PricingCardProps {
  name: string
  monthlyPrice: number | null
  annualPrice: number | null
  billing: 'monthly' | 'annual'
  features: readonly string[]
  popular: boolean
  dark: boolean
  ctaLabel: string
  ctaHref: string
}

export function PricingCard({
  name,
  monthlyPrice,
  annualPrice,
  billing,
  features,
  popular,
  dark,
  ctaLabel,
  ctaHref,
}: PricingCardProps): React.ReactElement {
  const price = billing === 'monthly' ? monthlyPrice : annualPrice
  const isEnterprise = price === null

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${popular ? 'order-first md:order-none' : ''} ${
        dark
          ? 'border-white/10 bg-[#0f172a] text-white'
          : popular
            ? 'border-accent-500 shadow-accent-500/10 shadow-lg'
            : 'border-slate-200'
      }`}
    >
      {popular && <PopularBadge />}

      <h3
        className={`text-lg font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}
      >
        {name}
      </h3>

      <PriceDisplay price={price} isEnterprise={isEnterprise} dark={dark} />

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span
              className={`text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <CtaButton
        href={ctaHref}
        label={ctaLabel}
        popular={popular}
        dark={dark}
      />
    </div>
  )
}

function PopularBadge(): React.ReactElement {
  return (
    <span className="bg-accent-500 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold text-slate-900">
      MAIS POPULAR
    </span>
  )
}

function PriceDisplay({
  price,
  isEnterprise,
  dark,
}: {
  price: number | null
  isEnterprise: boolean
  dark: boolean
}): React.ReactElement {
  if (isEnterprise) {
    return (
      <p
        className={`mt-4 text-2xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}
      >
        Sob consulta
      </p>
    )
  }

  return (
    <p className="mt-4">
      <span className="text-3xl font-bold text-slate-900">R${price}</span>
      <span className="text-sm text-slate-500">/mes</span>
    </p>
  )
}

function CtaButton({
  href,
  label,
  popular,
  dark,
}: {
  href: string
  label: string
  popular: boolean
  dark: boolean
}): React.ReactElement {
  if (popular) {
    return (
      <Link
        href={href}
        className="from-accent-500 to-accent-600 shadow-accent-500/20 hover:shadow-accent-500/30 mt-6 block rounded-xl bg-gradient-to-r py-3 text-center text-sm font-semibold text-slate-900 shadow-lg transition-all"
      >
        {label}
      </Link>
    )
  }

  if (dark) {
    return (
      <a
        href={href}
        className="mt-6 block rounded-xl border border-white/20 py-3 text-center text-sm font-medium text-white transition-colors hover:border-white/40"
      >
        {label}
      </a>
    )
  }

  return (
    <Link
      href={href}
      className="mt-6 block rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      {label}
    </Link>
  )
}
