import { Star } from 'lucide-react'

interface Testimonial {
  quote: string
  name: string
  company: string
  city: string
  initials: string
  initialsGradient: string
  highlighted: boolean
}

interface Metric {
  value: string
  label: string
}

const TESTIMONIALS: readonly Testimonial[] = [
  {
    quote:
      'O Bens Seguros transformou nossa operação. Reduzimos o tempo de emissão de propostas em 70% e nunca mais perdemos uma comissão.',
    name: 'Carlos Mendes',
    company: 'Mendes Corretora',
    city: 'São Paulo, SP',
    initials: 'CM',
    initialsGradient: 'from-primary-500 to-primary-600',
    highlighted: false,
  },
  {
    quote:
      'A integração com WhatsApp é um diferencial incrível. Nossos clientes recebem atualizações em tempo real e a satisfação disparou.',
    name: 'Ana Paula Santos',
    company: 'APS Seguros',
    city: 'Rio de Janeiro, RJ',
    initials: 'AS',
    initialsGradient: 'from-accent-500 to-accent-600',
    highlighted: true,
  },
  {
    quote:
      'Antes usávamos 3 sistemas diferentes. Agora tudo está em um lugar só. A produtividade do time triplicou em 2 meses.',
    name: 'Roberto Lima',
    company: 'Lima & Associados',
    city: 'Belo Horizonte, MG',
    initials: 'RL',
    initialsGradient: 'from-emerald-500 to-emerald-600',
    highlighted: false,
  },
] as const

const METRICS: readonly Metric[] = [
  { value: '2.000+', label: 'corretoras' },
  { value: '98%', label: 'satisfação' },
  { value: '3x', label: 'mais produtivo' },
  { value: '-40%', label: 'retrabalho' },
] as const

export function TestimonialsSection(): React.ReactElement {
  return (
    <section
      id="depoimentos"
      className="relative overflow-hidden bg-linear-to-b from-[#0f172a] to-[#111827] px-6 py-20"
    >
      <GoldOrb />
      <div className="relative z-10 mx-auto max-w-6xl">
        <SectionHeader />
        <TestimonialCards />
        <MetricsBar />
      </div>
    </section>
  )
}

function GoldOrb(): React.ReactElement {
  return (
    <div
      className="absolute top-1/2 right-0 h-[400px] w-[400px] -translate-y-1/2 animate-orb-drift rounded-full bg-accent-500/10 blur-[60px]"
      aria-hidden="true"
    />
  )
}

function SectionHeader(): React.ReactElement {
  return (
    <>
      <p className="text-center font-semibold text-accent-500 text-xs uppercase tracking-widest">
        Depoimentos
      </p>
      <h2 className="mt-4 text-center font-bold text-2xl text-white sm:text-3xl">
        Quem usa, recomenda
      </h2>
    </>
  )
}

function TestimonialCards(): React.ReactElement {
  return (
    <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
      {TESTIMONIALS.map((testimonial) => (
        <TestimonialCard key={testimonial.name} {...testimonial} />
      ))}
    </div>
  )
}

function TestimonialCard({
  quote,
  name,
  company,
  city,
  initials,
  initialsGradient,
  highlighted,
}: Testimonial): React.ReactElement {
  return (
    <div
      className={`rounded-xl border bg-white/3 p-6 backdrop-blur-sm ${
        highlighted ? 'border-accent-500/20' : 'border-white/8'
      }`}
    >
      <Stars />
      <blockquote className="mt-4 text-slate-300 text-sm italic leading-relaxed">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <hr className="my-4 border-white/10" />
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 items-center justify-center rounded-full bg-linear-to-br ${initialsGradient} font-bold text-white text-xs`}
        >
          {initials}
        </div>
        <div>
          <p className="font-medium text-sm text-white">{name}</p>
          <p className="text-slate-400 text-xs">
            {company} &middot; {city}
          </p>
        </div>
      </div>
    </div>
  )
}

function Stars(): React.ReactElement {
  return (
    <div className="flex gap-1" aria-label="5 de 5 estrelas">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="size-4 fill-accent-500 text-accent-500" />
      ))}
    </div>
  )
}

function MetricsBar(): React.ReactElement {
  return (
    <div className="mt-16 grid grid-cols-2 gap-6 md:grid-cols-4">
      {METRICS.map((metric) => (
        <div key={metric.label} className="text-center">
          <p className="font-bold text-2xl text-white sm:text-3xl">
            {metric.value}
          </p>
          <p className="mt-1 text-slate-400 text-sm">{metric.label}</p>
        </div>
      ))}
    </div>
  )
}
