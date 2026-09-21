import { XCircle } from 'lucide-react'

interface PainPoint {
  title: string
  description: string
}

const PAIN_POINTS: readonly PainPoint[] = [
  {
    title: 'Planilhas manuais',
    description:
      'Horas perdidas atualizando planilhas, com risco de erros e dados desatualizados que comprometem decisões.',
  },
  {
    title: 'Comissões perdidas',
    description:
      'Sem controle automático, comissões ficam sem cobrar e a receita escapa entre os dedos.',
  },
  {
    title: 'Atendimento lento',
    description:
      'Clientes esperando respostas por dias enquanto você busca informações em sistemas diferentes.',
  },
] as const

export function ProblemSection(): React.ReactElement {
  return (
    <section id="problema" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-semibold text-accent-700 text-xs uppercase tracking-widest">
          O Problema
        </p>
        <h2 className="mt-4 text-center font-bold text-2xl text-slate-900 sm:text-3xl">
          Cansado de planilhas e retrabalho?
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PAIN_POINTS.map((point) => (
            <PainCard key={point.title} {...point} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PainCard({ title, description }: PainPoint): React.ReactElement {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <XCircle className="size-8 text-red-500" />
      <h3 className="mt-4 font-semibold text-lg text-slate-900">{title}</h3>
      <p className="mt-2 text-slate-600 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  )
}
