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
        <p className="text-center font-semibold text-accent-700 text-xs uppercase tracking-widest">
          Como Funciona
        </p>
        <h2 className="mt-4 text-center font-bold text-2xl text-slate-900 sm:text-3xl">
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
      className="absolute top-6 right-0 left-0 hidden h-0.5 bg-linear-to-r from-primary-500 via-accent-500 to-emerald-500 md:block"
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
        className={`flex size-12 items-center justify-center rounded-full bg-linear-to-br ${gradient} font-bold text-lg text-white shadow-lg`}
      >
        {number}
      </div>
      <h3 className="mt-4 font-semibold text-lg text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  )
}
