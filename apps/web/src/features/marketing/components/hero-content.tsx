import Link from 'next/link'

export function HeroContent(): React.ReactElement {
  return (
    <div className="relative z-10 mx-auto max-w-3xl text-center">
      <BadgePill />
      <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
        Tudo que sua corretora{' '}
        <span className="from-accent-400 to-accent-500 bg-gradient-to-r bg-clip-text text-transparent">
          precisa para crescer
        </span>
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-slate-400">
        Gerencie propostas, apolices, comissoes e atenda clientes pelo WhatsApp.
        O ERP completo para corretoras de seguros brasileiras.
      </p>
      <HeroActions />
    </div>
  )
}

function BadgePill(): React.ReactElement {
  return (
    <span className="border-accent-500/30 bg-accent-500/10 text-accent-400 inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium">
      2.000+ corretoras ja usam
    </span>
  )
}

function HeroActions(): React.ReactElement {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Link
        href="/register"
        className="from-accent-500 to-accent-600 shadow-accent-500/25 hover:shadow-accent-500/40 rounded-xl bg-gradient-to-r px-8 py-3 text-base font-semibold text-slate-900 shadow-lg transition-all"
      >
        Comecar Gratis
      </Link>
      <a
        href="#recursos"
        className="rounded-xl border border-white/10 px-8 py-3 text-base font-medium text-slate-300 transition-all hover:border-white/20 hover:text-white"
      >
        Ver Recursos
      </a>
    </div>
  )
}
