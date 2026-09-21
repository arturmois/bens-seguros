import Link from 'next/link'

export function HeroContent(): React.ReactElement {
  return (
    <div className="relative z-10 mx-auto max-w-3xl text-center">
      <BadgePill />
      <h1 className="mt-6 font-bold text-4xl text-white leading-tight tracking-tight sm:text-5xl">
        Tudo que sua corretora{' '}
        <span className="bg-linear-to-r from-accent-400 to-accent-500 bg-clip-text text-transparent">
          precisa para crescer
        </span>
      </h1>
      <p className="mt-6 text-lg text-slate-400 leading-relaxed">
        Gerencie propostas, apólices, comissões e atenda clientes pelo WhatsApp.
        O ERP completo para corretoras de seguros brasileiras.
      </p>
      <HeroActions />
    </div>
  )
}

function BadgePill(): React.ReactElement {
  return (
    <span className="inline-flex items-center rounded-full border border-accent-500/30 bg-accent-500/10 px-4 py-1.5 font-medium text-accent-400 text-sm">
      2.000+ corretoras já usam
    </span>
  )
}

function HeroActions(): React.ReactElement {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
      <Link
        href="/register"
        className="rounded-xl bg-linear-to-r from-accent-500 to-accent-600 px-8 py-3 font-semibold text-base text-slate-900 shadow-accent-500/25 shadow-lg transition-all hover:shadow-accent-500/40"
      >
        Começar Grátis
      </Link>
      <a
        href="#recursos"
        className="rounded-xl border border-white/10 px-8 py-3 font-medium text-base text-slate-300 transition-all hover:border-white/20 hover:text-white"
      >
        Ver Recursos
      </a>
    </div>
  )
}
