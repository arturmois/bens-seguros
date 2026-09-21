import {
  DollarSign,
  FileText,
  LayoutDashboard,
  MessageCircle,
} from 'lucide-react'

interface FeatureCard {
  title: string
  description: string
  icon: React.ReactNode
  span: string
  hoverBorder: string
  extra?: React.ReactNode
}

const FEATURES: readonly FeatureCard[] = [
  {
    title: 'Propostas',
    description:
      'Fluxo completo de cotação à emissão, com automações inteligentes e histórico rastreável.',
    icon: <FileText className="size-6 text-primary-400" />,
    span: 'lg:col-span-2',
    hoverBorder: 'hover:border-primary-500/20',
    extra: <WorkflowPills />,
  },
  {
    title: 'Comissões',
    description:
      'Controle automático de recebimentos, parcelas e repasses. Nunca mais perca uma comissão.',
    icon: <DollarSign className="size-6 text-accent-400" />,
    span: '',
    hoverBorder: 'hover:border-accent-500/20',
  },
  {
    title: 'Chat + WhatsApp',
    description:
      'Atendimento integrado via WhatsApp com IA. Responda clientes em segundos, não em dias.',
    icon: <MessageCircle className="size-6 text-emerald-400" />,
    span: '',
    hoverBorder: 'hover:border-emerald-500/20',
  },
  {
    title: 'Dashboard',
    description:
      'Visão completa da operação em tempo real. KPIs, gráficos e insights para tomar decisões rápidas.',
    icon: <LayoutDashboard className="size-6 text-indigo-400" />,
    span: 'lg:col-span-2',
    hoverBorder: 'hover:border-indigo-500/20',
  },
] as const

export function FeaturesSection(): React.ReactElement {
  return (
    <section
      id="recursos"
      className="relative overflow-hidden bg-[#0f172a] px-6 py-20"
    >
      <FeaturesBackground />
      <div className="relative z-10 mx-auto max-w-6xl">
        <p className="text-center font-semibold text-accent-500 text-xs uppercase tracking-widest">
          Recursos
        </p>
        <h2 className="mt-4 text-center font-bold text-2xl text-white sm:text-3xl">
          Tudo integrado em uma única plataforma
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <BentoCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturesBackground(): React.ReactElement {
  return (
    <>
      <div
        className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[24px_24px]"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 left-1/4 h-[400px] w-[400px] animate-orb-drift rounded-full bg-primary-500/10 blur-[60px]"
        aria-hidden="true"
      />
    </>
  )
}

function BentoCard({
  title,
  description,
  icon,
  span,
  hoverBorder,
  extra,
}: FeatureCard): React.ReactElement {
  return (
    <div
      className={`rounded-xl border border-white/8 bg-white/3 p-5 transition-colors ${hoverBorder} ${span}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="font-semibold text-lg text-white">{title}</h3>
      </div>
      <p className="mt-3 text-slate-400 text-sm leading-relaxed">
        {description}
      </p>
      {extra}
    </div>
  )
}

function WorkflowPills(): React.ReactElement {
  const stages = ['Cotação', 'Análise', 'Emissão'] as const
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {stages.map((stage, index) => (
        <span key={stage} className="flex items-center gap-2">
          <span className="rounded-full bg-primary-500/20 px-3 py-1 font-medium text-primary-300 text-xs">
            {stage}
          </span>
          {index < stages.length - 1 && (
            <span className="text-slate-600" aria-hidden="true">
              &rarr;
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
