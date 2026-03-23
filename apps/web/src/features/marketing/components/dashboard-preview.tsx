import { TrendingUp } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  change: string
}

const STATS: readonly StatCardProps[] = [
  { label: 'Premios Total', value: 'R$ 2,4M', change: '+12%' },
  { label: 'Comissoes', value: 'R$ 360K', change: '+8%' },
  { label: 'Apolices Ativas', value: '1.247', change: '+5%' },
] as const

const BAR_HEIGHTS = [40, 65, 50, 80, 60, 90, 55, 75, 85, 70, 95, 68] as const

export function DashboardPreview(): React.ReactElement {
  return (
    <div className="animate-float mx-auto mt-16 max-w-4xl">
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/80 bg-white/[0.03] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <WindowChrome />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
        <MiniBarChart />
      </div>
    </div>
  )
}

function WindowChrome(): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <div className="size-3 rounded-full bg-red-500/60" />
      <div className="size-3 rounded-full bg-yellow-500/60" />
      <div className="size-3 rounded-full bg-green-500/60" />
      <div className="ml-2 h-5 w-48 rounded bg-white/[0.05]" />
    </div>
  )
}

function StatCard({ label, value, change }: StatCardProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400">
        <TrendingUp className="size-3" />
        {change}
      </span>
    </div>
  )
}

function MiniBarChart(): React.ReactElement {
  return (
    <div className="mt-4 flex items-end gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
      {BAR_HEIGHTS.map((height, index) => (
        <div
          key={index}
          className={`flex-1 rounded-sm ${
            index % 3 === 0 ? 'bg-accent-500/60' : 'bg-primary-500/40'
          }`}
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  )
}
