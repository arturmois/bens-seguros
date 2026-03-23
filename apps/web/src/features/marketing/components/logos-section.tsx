const INSURERS = [
  'Porto Seguro',
  'SulAmerica',
  'Allianz',
  'Bradesco',
  'Tokio Marine',
  'Liberty',
] as const

export function LogosSection(): React.ReactElement {
  return (
    <section id="logos" className="bg-[#f8fafc] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
          Seguradoras Parceiras
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {INSURERS.map((name) => (
            <div
              key={name}
              className="rounded-lg bg-slate-200/50 px-6 py-3 text-sm font-semibold text-slate-500 opacity-60 transition hover:opacity-100"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
