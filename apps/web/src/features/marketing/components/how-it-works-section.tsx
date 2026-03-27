interface Step {
  number: number
  title: string
  description: string
  gradient: string
}

const STEPS: readonly Step[] = [
  {
    number: 1,
    title: 'Cadastre-se',
    description:
      'Crie sua conta em menos de 2 minutos. Sem cartão de crédito, sem burocracia.',
    gradient: 'from-primary-500 to-primary-600',
  },
  {
    number: 2,
    title: 'Configure',
    description:
      'Importe seus clientes, conecte seu WhatsApp e personalize seu fluxo de trabalho.',
    gradient: 'from-accent-500 to-accent-600',
  },
  {
    number: 3,
    title: 'Use',
    description:
      'Gerencie propostas, apólices e comissões em um único lugar, com inteligência artificial.',
    gradient: 'from-emerald-500 to-emerald-600',
  },
] as const

export function HowItWorksSection(): React.ReactElement {
  return (
    <section id="como-funciona" className="bg-[#f8fafc] px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-accent-700 text-center text-xs font-semibold uppercase tracking-widest">
          Como Funciona
        </p>
        <h2 className="mt-4 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Simples de começar, poderoso para escalar
        </h2>
        <div className="relative mt-16">
          <ConnectingLine />
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {STEPS.map((step) => (
              <StepCard key={step.number} {...step} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ConnectingLine(): React.ReactElement {
  return (
    <div
      className="from-primary-500 via-accent-500 bg-linear-to-r absolute left-0 right-0 top-6 hidden h-0.5 to-emerald-500 md:block"
      aria-hidden="true"
    />
  )
}

function StepCard({
  number,
  title,
  description,
  gradient,
}: Step): React.ReactElement {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div
        className={`bg-linear-to-br flex size-12 items-center justify-center rounded-full ${gradient} text-lg font-bold text-white shadow-lg`}
      >
        {number}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  )
}
