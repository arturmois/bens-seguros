'use client'

interface PricingToggleProps {
  billing: 'monthly' | 'annual'
  onBillingChange: (billing: 'monthly' | 'annual') => void
}

export function PricingToggle({
  billing,
  onBillingChange,
}: PricingToggleProps): React.ReactElement {
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <span
        className={`font-medium text-sm ${
          billing === 'monthly' ? 'text-slate-900' : 'text-slate-400'
        }`}
      >
        Mensal
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={billing === 'annual'}
        aria-label="Alternar entre cobranca mensal e anual"
        onClick={() =>
          onBillingChange(billing === 'monthly' ? 'annual' : 'monthly')
        }
        className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-slate-200 transition-colors data-[state=checked]:bg-accent-500"
        data-state={billing === 'annual' ? 'checked' : 'unchecked'}
      >
        <span
          className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
            billing === 'annual' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span
        className={`font-medium text-sm ${
          billing === 'annual' ? 'text-slate-900' : 'text-slate-400'
        }`}
      >
        Anual
        <span className="ml-1 text-accent-600 text-xs">-20%</span>
      </span>
    </div>
  )
}
