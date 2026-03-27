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
      'Fluxo completo de cotacao a emissao, com automacoes inteligentes e historico rastreavel.',
    icon: <FileText className="text-primary-400 size-6" />,
    span: 'lg:col-span-2',
    hoverBorder: 'hover:border-primary-500/20',
    extra: <WorkflowPills />,
  },
  {
    title: 'Comissoes',
    description:
      'Controle automatico de recebimentos, parcelas e repasses. Nunca mais perca uma comissao.',
    icon: <DollarSign className="text-accent-400 size-6" />,
    span: '',
    hoverBorder: 'hover:border-accent-500/20',
  },
  {
    title: 'Chat + WhatsApp',
    description:
      'Atendimento integrado via WhatsApp com IA. Responda clientes em segundos, nao em dias.',
    icon: <MessageCircle className="size-6 text-emerald-400" />,
    span: '',
    hoverBorder: 'hover:border-emerald-500/20',
  },
  {
    title: 'Dashboard',
    description:
      'Visao completa da operacao em tempo real. KPIs, graficos e insights para tomar decisoes rapidas.',
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
        <p className="text-accent-500 text-center text-xs font-semibold uppercase tracking-widest">
          Recursos
        </p>
        <h2 className="mt-4 text-center text-2xl font-bold text-white sm:text-3xl">
          Tudo integrado em uma unica plataforma
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
        className="bg-size-[24px_24px] absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)]"
        aria-hidden="true"
      />
      <div
        className="animate-orb-drift bg-primary-500/10 absolute left-1/4 top-0 h-[400px] w-[400px] rounded-full blur-[60px]"
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
      className={`border-white/8 bg-white/3 rounded-xl border p-5 transition-colors ${hoverBorder} ${span}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        {description}
      </p>
      {extra}
    </div>
  )
}

function WorkflowPills(): React.ReactElement {
  const stages = ['Cotacao', 'Analise', 'Emissao'] as const

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {stages.map((stage, index) => (
        <span key={stage} className="flex items-center gap-2">
          <span className="bg-primary-500/20 text-primary-300 rounded-full px-3 py-1 text-xs font-medium">
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
